/*
usage:
// Array to store the list of urls to fetch, max 50 urls at one time
  var arr = ["https://developer.mozilla.org/en-US/docs/Web/API/Request","https://en.wikipedia.org/"]
// paste your cloudflare workers dev url here
 fetch('urlofcloudflareworkerdev',{
  method: 'POST',
  body: JSON.stringify(arr)
})
.then(response => response.text())
.then(console.log)

*/

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond to the request
 * @param {Request} request
 *
 */
const responseinit = {
  headers: {
    'content-type': 'text/html;charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Vary': 'Origin',
  },
}

async function handleRequest(request) {
  // cloudflare sends differet ip address each time from fixed pool of size 3-5
  // return await fetch('https://httpbin.org/ip').then(response => response.text()).then(data => new Response(data,responseinit) )
  // https://community.cloudflare.com/t/how-do-i-read-the-request-body-as-json/155393
  let requestText = await request.clone().text()
  // Emulating the request received
  let browserrequest = new Request(request)

  browserrequest.headers.delete('Origin')
  browserrequest.headers.delete('referer')
  let responsearr = []
  let urlArr = JSON.parse(requestText)
  let results = ""

  for (var url of urlArr) {
    fetchRes = fetch(url, {
        headers: browserrequest.headers
      })
      .then(response => textWIthUrl(response))
      .then(data => results = results.concat(data))
      .catch(error => results.concat("<a class='multicorserror'>" + error.toString() + "</a>"))
    responsearr.push(fetchRes)

  }

  return await Promise.allSettled(responsearr).then(() => {
    return new Response(results, responseinit)
  })
}

async function textWIthUrl(response) {
  // we only want responses which are text
  if (response.headers.get('content-type').toLowerCase().startsWith('text/')) {
    let okstatus = await response.ok
    let urlval = await response.url
    let newval = "<a class='multicorsproxy' href='" + urlval + "'>" + okstatus + "</a>"
    let res = await response.text()

    return newval + res
  }
  return ""

}
