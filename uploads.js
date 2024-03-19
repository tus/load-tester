/* eslint-disable import/no-unresolved */
import http from 'k6/http'
import { check, fail } from 'k6'
import { randomBytes } from 'k6/crypto'

// Configuration
// -------------
// Upload creation endpoint
const ENDPOINT = 'https://tusd.tusdemo.net/files/'
// Size of a single upload in bytes
const UPLOAD_LENGTH = 1024 * 1024
// Number of bytes to upload in a single request. If it's <= UPLOAD_LENGTH, a single request
// is used to transfer the data. Otherwise, multiple requests are used.
const REQUEST_PAYLOAD_SIZE = UPLOAD_LENGTH
// If true, the upload data will be included in the upload creation request. Otherwise,
// an empty upload creation request is issued.
const CREATION_WITH_DATA = false
// If true, a HEAD request will be sent after each PATCH request, simulating a complete upload
// resumption.
const RETRIEVE_OFFSET_BETWEEN_REQUESTS = false
// Number of concurrent simulated users
const VIRTUAL_USERS = 2
// Number of sequential uploads per simulated user
const UPLOADS_PER_VIRTUAL_USER = 10

/** @type Uint8Array[] */
const PAYLOADS = []
for (let offset = 0; offset < UPLOAD_LENGTH;) {
  const payloadSize = Math.min(UPLOAD_LENGTH - offset, REQUEST_PAYLOAD_SIZE)
  const payload = new Uint8Array(randomBytes(payloadSize))
  PAYLOADS.push(payload)

  offset += payloadSize
}

export const options = {
  scenarios: {
    contacts: {
      executor   : 'per-vu-iterations',
      vus        : VIRTUAL_USERS,
      iterations : UPLOADS_PER_VIRTUAL_USER,
      maxDuration: '30s',
    },
  },
}

/**
 * @param {string} endpoint
 * @param {Uint8Array?} payload
 */
function uploadCreation (endpoint, payload = null) {
  const body = payload !== null ? payload.buffer : null
  /** @type Record<string, string> */
  const headers = {
    'Upload-Length': `${UPLOAD_LENGTH}`,
    'Tus-Resumable': '1.0.0',
  }
  if (payload !== null) {
    headers['Content-Type'] = 'application/offset+octet-stream'
  }

  const res = http.post(endpoint, body, {
    headers,
  })

  if (
    !check(res, {
      'response code was 201'                 : (r) => r.status === 201,
      'response includes Tus-Resumable header': (r) => r.headers['Tus-Resumable'] === '1.0.0',
      'response includes upload URL'          : (r) => (r.headers['Location'] || '').length > 0,
      'response includes upload offset'       : (r) => payload == null
        || r.headers['Upload-Offset'] === `${payload.length}`,
    })
  ) {
    fail('upload creation failed')
  }

  // TODO: Potentially merge with creation URL, if the upload URL is not absolute
  const uploadUrl = res.headers['Location']
  const offset =    payload !== null ? parseInt(res.headers['Upload-Offset'], 10) : 0

  return { uploadUrl, offset }
}

/**
 * @param {string} uploadUrl
 * @param {number} offset
 * @param {Uint8Array} payload
 */
function uploadAppend (uploadUrl, offset, payload) {
  // We must pass the ArrayBuffer, not the typed array to `http.patch` as a body.
  const res = http.patch(uploadUrl, payload.buffer, {
    headers: {
      'Upload-Offset': `${offset}`,
      'Tus-Resumable': '1.0.0',
      'Content-Type' : 'application/offset+octet-stream',
    },
  })

  if (
    !check(res, {
      'response code was 204'                 : (r) => r.status === 204,
      'response includes Tus-Resumable header': (r) => r.headers['Tus-Resumable'] === '1.0.0',
      'response includes upload offset'       : (r) => r.headers['Upload-Offset'] === `${offset + payload.length}`,
    })
  ) {
    fail('upload appending failed')
  }

  const newOffset = offset + payload.length

  return newOffset
}

/**
 * @param {string} uploadUrl
 * @param {number} expectedOffset
 */
function offsetRetrieve (uploadUrl, expectedOffset) {
  const res = http.head(uploadUrl, {
    headers: {
      'Tus-Resumable': '1.0.0',
    },
  })

  if (
    !check(res, {
      'response code was 204'                 : (r) => r.status === 200,
      'response includes Tus-Resumable header': (r) => r.headers['Tus-Resumable'] === '1.0.0',
      'response includes upload offset'       : (r) => r.headers['Upload-Offset'] === `${expectedOffset}`,
    })
  ) {
    fail('offset retrieve failed')
  }
}

// The function that defines VU logic.
//
// See https://grafana.com/docs/k6/latest/examples/get-started-with-k6/ to learn more
// about authoring k6 scripts.
//
export default function run () {
  // Shallow copy of payloads
  const payloads = [...PAYLOADS]

  const upload = uploadCreation(ENDPOINT, CREATION_WITH_DATA ? payloads.shift() : null)
  const { uploadUrl } = upload
  let { offset } = upload

  for (const payload of payloads) {
    offset = uploadAppend(uploadUrl, offset, payload)

    if (RETRIEVE_OFFSET_BETWEEN_REQUESTS) {
      offsetRetrieve(uploadUrl, offset)
    }
  }

  if (
    !check(offset, {
      'offset matches upload length': (o) => o === UPLOAD_LENGTH,
    })
  ) {
    if (offset !== UPLOAD_LENGTH) {
      fail('upload was not completed')
    }
  }
}
