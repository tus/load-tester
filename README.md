# Upload load testing tool

This repository contains a simple tool for testing the performance of resumable upload servers using [k6](https://k6.io/). It currently supports [draft-ietf-httpbis-resumable-upload-03](https://datatracker.ietf.org/doc/draft-ietf-httpbis-resumable-upload/03/).

To use, please [install k6](https://grafana.com/docs/k6/latest/get-started/installation/) and clone this repository. Running the load tester is then a matter of adjusting the configuration variables in the beginning of `uploads.js` and then executing it using k6:

```
$ k6 run uploads.js

          /\      |‾‾| /‾‾/   /‾‾/   
     /\  /  \     |  |/  /   /  /    
    /  \/    \    |     (   /   ‾‾\  
   /          \   |  |\  \ |  (‾)  | 
  / __________ \  |__| \__\ \_____/ .io

     execution: local
        script: uploads.js
        output: -

     scenarios: (100.00%) 1 scenario, 2 max VUs, 1m0s max duration (incl. graceful stop):
              * contacts: 10 iterations for each of 2 VUs (maxDuration: 30s, gracefulStop: 30s)


     ✓ response code was 201
     ✓ response includes Tus-Resumable header
     ✓ response includes upload URL
     ✓ response includes upload offset
     ✓ response code was 204
     ✓ offset matches upload length

     checks.........................: 100.00% ✓ 160      ✗ 0  
     data_received..................: 40 kB   5.4 kB/s
     data_sent......................: 21 MB   2.9 MB/s
     http_req_blocked...............: avg=15.75ms  min=1µs      med=5µs      max=315.09ms p(90)=12µs     p(95)=15.76ms 
     http_req_connecting............: avg=5.27ms   min=0s       med=0s       max=106.75ms p(90)=0s       p(95)=5.21ms  
     http_req_duration..............: avg=333.15ms min=143.31ms med=273.95ms max=1.11s    p(90)=503.73ms p(95)=579.21ms
       { expected_response:true }...: avg=333.15ms min=143.31ms med=273.95ms max=1.11s    p(90)=503.73ms p(95)=579.21ms
     http_req_failed................: 0.00%   ✓ 0        ✗ 40 
     http_req_receiving.............: avg=82.07µs  min=20µs     med=65.5µs   max=202µs    p(90)=138.7µs  p(95)=149.35µs
     http_req_sending...............: avg=36.98ms  min=11µs     med=683.5µs  max=776.72ms p(90)=5.57ms   p(95)=37.4ms  
     http_req_tls_handshaking.......: avg=7.16ms   min=0s       med=0s       max=144.67ms p(90)=0s       p(95)=7.1ms   
     http_req_waiting...............: avg=296.09ms min=143.18ms med=272.39ms max=553.41ms p(90)=462.87ms p(95)=499.34ms
     http_reqs......................: 40      5.46181/s
     iteration_duration.............: avg=698.85ms min=492.47ms med=611.67ms max=1.61s    p(90)=836.37ms p(95)=1.55s   
     iterations.....................: 20      2.730905/s
     vus............................: 1       min=1      max=2
     vus_max........................: 2       min=2      max=2


running (0m07.3s), 0/2 VUs, 20 complete and 0 interrupted iterations
contacts ✓ [======================================] 2 VUs  07.3s/30s  20/20 iters, 10 per VU
```

In the output you can see that all built-in asserts were met as well as statistics on the transferred data volume and the overall throughput.
