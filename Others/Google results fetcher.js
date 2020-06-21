// This script is very slow and I am not going to use it as it doesn't work most of the time
// Just keeping this script for future reference

// This script fetchs google search result link
// Give the google query in searchquery uri component and then
// it will return the response text of all urls which were detect in google search result


// How to fetch results from here
/*
fetch('workersurl/?searchquery=' + encodeURIComponent('Fast bikes') )
  .then(response => response.text())
  .then(data => console.log(data) );
*/


// Handler when receiving fetch request
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// request headers to add when making a request, we only need text/html
const requestinit = {
  headers: {
    'content-type': 'text/html;charset=UTF-8',
  },
}

// response headers to add when returning response
// Added Access-Control-Allow-Origin header to allow CORS requests
// Added Vary header to browser will cache correctly
// Ref: https://developers.cloudflare.com/workers/templates/pages/cors_header_proxy/
const responseinit = {
  headers: {
    'content-type': 'text/html;charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Vary': 'Origin',
  },
}


// Handler function
async function handleRequest(request) {

  // Creating a new modifyable request from the request received from browser, as the received request is immutable
  // Using browserrequest will make look as if the request has come from browser, otherwise the google will think
  // the request is from a bot
  // let will have block scope and var will have function scope
  let browserrequest = new Request(request)
  browserrequest = browserrequest.headers.set('content-type', 'text/html;charset=UTF-8')
  let queryend = ""
  // Getting searchquery parameter from url
  // Currently Parameters through GET is suppported, urls should be less that 2000 characters
  // We can receive the data using post also using 'await request.text()', but there are somethings I have debug from using it,
  // POST does not have any limit sent through it's body
  let searchquery = (new URL(request.url)).searchParams.get('searchquery')


  /*

    // removing in quran from end of search query to make it easy to search for anything and not just religious things
    if( /in quran/i.test(searchquery)){
       queryend = " in quran"
       searchquery.replace(/in quran/i, "")
       searchquery = searchquery.trim()
    }

   let translateurl = new URL('https://www.google.com/search?q=' + "google translate "+searchquery+" in english" );


    let requestTranslate = new Request(translateurl, browserrequest)


    let responseTranslate = await fetch(requestTranslate)

    var resTranslate = await responseTranslate.text()


   var translatearr = resTranslate.match(/to\s{1,5}English.+?Open\s{1,5}in\s{1,5}Translate/i) || [];

     if (translatearr.length){
        let transquery = translatearr[0].match(/>[^<^>]+?</i) || []
        if(transquery.length)
          searchquery = transquery[0].substring(1, transquery[0].length-1)
     }
*/





  let myurl = new URL('https://www.google.com/search?q=' + searchquery + queryend);

  // passing browserrequest in contructor will emulate requests directly from user browsers I assume
  let requestgoogle = new Request(myurl, browserrequest)
  // Set Origin to google itself, might have to do this in future if google starts blocking requests
  // something like this 'Origin', new URL(myurl).origin

  // Fetching response from google
  let responsegoogle = await fetch(requestgoogle)


  // Fetching response text, not sure using var or let will make any difference
  var restext = await responsegoogle.text()

  // This array will contain the https or http links from google page
  var purelink = []
  // Regex pattern to search google youtube or # in a link
  let ignorepattern = /(google|youtube|#)/ {
    // Fetch all href from google html response using regex
    // Adding || [] at the end, match function will return null when no match occurs
    var hreflinks = restext.match(/href\s*?=\s*?('|").+?('|")/gi) || [];


    // Ref: https://stackoverflow.com/questions/3010840/loop-through-an-array-in-javascript

    for (link of hreflinks) {
      // Fetching all http/https links
      link = link.match(/(http|https).+?('|"|&amp;)/i) || [];

      if (link.length > 0 && !ignorepattern.test(link[0])) {

        if (link[0].charAt(link[0].length - 1) == ';') {
          // Removing &amp; from the end link
          link[0] = link[0].substring(0, link[0].length - 5)
        } else {
          // Removing ' or " from the end of link
          link[0] = link[0].substring(0, link[0].length - 1)
        }
        // Somelinks such as https://www.wiki.com and https://wiki.com are same
        // Removing www. from all the links as it's not necessary and will help in fetching only unique url
        purelink.push(link[0].replace(/www\./i, ""))


      }

    }
    // Removing duplicate urls using set
    purelink = Array.from(new Set(purelink));

  }



  // Cloudflare workers only support upto 50 subrequests
  let subreq = 45
  //slicing the links array to 45 to be under 50 subrequests limit
  purelink = purelink.slice(0, subreq)


  /*


      for (let link of purelink) {

          request = new Request(link, request)
          // Set Origin to google itself
        //  request.headers.set('Referer', new URL(myurl).origin)
          // using var instead of let for response variable, seems to solve the problem for 302 document moved error
          // let will have block scope and var will have function scope
          let response = await fetch(request)
          // response = new Response(response.body, response)
          // Set CORS headers
          // response.headers.set('Access-Control-Allow-Origin', '*')

          // Append to/Add Vary header so browser will cache response correctly
          // response.headers.append('Vary', 'Origin')



          responsearr.push(response)
        //  let resret = await response.text()
        //  textarr.push(resret)
   //    textarr.push(response.text())

      }

     var responses = await Promise.all(responsearr)

    for (let response of responses){
       textarr.push(response.text())
    }



    var results = await Promise.all(textarr)
  */
  // Recreate the response so we can modify the headers
  // response = new Response(results, responses)

  // Counter variable to count for loop
  let count = 0
  // Array to hold responses
  let responsearr = []
  // Maximum number of links to fetch parallel or concurrently, it will use more cpu
  // but will save time, workers support upto 6
  let maxlinks = 6
  // This will hold the response.text()
  let results = ""
  let responses
  // Refer the aggregate requests template to see how to fetch multiple requests at same time
  // Refer: https://developers.cloudflare.com/workers/templates/pages/aggregate_requests/


  for (url of purelink) {
    // We are not using await before fetch to make this run parallel, if we added await, then it will wait
    // until the request is received
    // Refer slow async wait and fast async wait example from here:
    // https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await
    responsearr.push(fetch(url, browserrequest))
    count++

    if (count % maxlinks == 0) {
      // Calling await when 6 links have been fetched concurrently
      responses = await Promise.all(responsearr)
      // Arrow function
      // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
      results = results.concat(await Promise.all(responses.map(response => {
        // return response.text only if content-type startswith text, we dont won't blobs like jpeg etc
        if (response.headers.get('content-type').startsWith('text/'))
          return response.text()

      })))

      //emptying array
      responsearr = []
    }


  }
  // Remaining urls
  responses = await Promise.all(responsearr)
  results = results.concat(await Promise.all(responses.map(response => {
    // return response.text only if content-type startswith text, we dont won't blobs like jpeg etc
    if (response.headers.get('content-type').startsWith('text/'))
      return response.text()

  })))



  /*

    const responses = await Promise.all([fetch(myurl[0], requestinit), fetch(myurl[1], requestinit), fetch(myurl[2], requestinit), fetch(myurl[3], requestinit), fetch(myurl[4], requestinit), fetch(myurl[5], requestinit)])
    const results = await Promise.all([ responses[0].text(), responses[1].text(),  responses[2].text(), responses[3].text(), responses[4].text(), responses[5].text()])

     const responses1 = await Promise.all([fetch(myurl[6], requestinit), fetch(myurl[7], requestinit), fetch(myurl[8], requestinit), fetch(myurl[9], requestinit), fetch(myurl[10], requestinit), fetch(myurl[11], requestinit)])
    const results1 = await Promise.all([responses1[0].text(), responses1[1].text(), responses1[2].text(), responses1[3].text(), responses1[4].text(), responses1[5].text()])

     const responses2 = await Promise.all([fetch(myurl[12], requestinit), fetch(myurl[13], requestinit), fetch(myurl[14], requestinit), fetch(myurl[15], requestinit), fetch(myurl[16], requestinit), fetch(myurl[17], requestinit)])
    const results2 = await Promise.all([responses2[0].text(), responses2[1].text(), responses2[2].text(), responses2[3].text(), responses2[4].text(), responses2[5].text()])

   */
  // const allrez = await Promise.all(results1,results)

  // https://stackoverflow.com/questions/181095/regular-expression-to-extract-text-from-html
  // parsing the content as text to reduce the size

  // results = results.replace(/<(script|style).*?<\/\1>/gi , " ")
  //  results = results.replace(/<(.|\n)*?>/gi , " ")
  //   results = results.replace(/\s\s+/gi , " ")


  //        rewriter.on('style', new ElementHandler());
  //        return  rewriter.transform(new Response(results, responseinit))

  // return new Response(large, responseinit)
  return new Response(results, responseinit)

  /*
   const rewriter = new HTMLRewriter()
          rewriter.on('*', new ElementHandler());
        return  rewriter.transform(new Response(results, responseinit))

  */


  //   response = new Response(results)
  // Set CORS headers
  //  response.headers.set('Access-Control-Allow-Origin', '*')

  // Append to/Add Vary header so browser will cache response correctly
  //   response.headers.append('Vary', 'Origin')
  //  response.headers.set('content-type', 'text/html;')

  //    return response
  //     return new Response(results, {status: 200 , headers: {
  //      'Access-Control-Allow-Origin':'*',
  //       'Vary':'Origin',
  //     }} )


  // toy =  toy.replace(/google/gi, 'panda')

  //   return response
  // return new Response(toy, {status: 200})

  // const rewriter = new HTMLRewriter().on('a[href]', new FetchLinks())
  //  let newresponse = rewriter.transform(response)

  // const results = await Promise.all(responses)
  // response = new Response(results.body, response)
  // Set CORS headers
  // response.headers.set('Access-Control-Allow-Origin', '*')

  // Append to/Add Vary header so browser will cache response correctly
  // response.headers.append('Vary', 'Origin')



  // return response
  // return new Response(console.log(links), {status: 200})
  //  return newresponse

  // return response
  //  return new Response(abc, {status: 200})



}
// var abc = 'anna'
// var linkpattern = /https?:\/\/.*?&amp;/
// var links = []
// var responses = []
//var responsearr = []
// var textarr = []

/*

class FetchLinks {
    element(element) {
        // An incoming element, such as `div`
        //  console.log(`Incoming element: ${element.getAttribute('href')}`)


        let linkarray = `${element.getAttribute('href')}`.match(linkpattern)
        if (Array.isArray(linkarray) && linkarray.length > 0) {
            // Ref: https://stackoverflow.com/questions/11743392/check-if-an-array-is-empty-or-exists
            if (!ignorepattern.test(linkarray[0])) {

                // Remove &amp; and unescape the link
                linkarray[0] = linkarray[0].substring(0, linkarray[0].length - 5)
                linkarray[0] = unescape(linkarray[0]);
                // links.push(linkarray[0])
                console.log(linkarray[0])
                // code to fetch the links

                request = new Request(linkarray[0], request)
                // Set Origin to google itself
                request.headers.set('Origin', new URL(linkarray[0]).origin)
                // using var instead of let for response variable, seems to solve the problem for 302 document moved error
                // let will have block scope and var will have function scope
                // have to write code to remove/avoid multiple same links

                // let res = await fetch(request)
                responses.push(res)
                // let text = await response.text()

                // let linker =   text.search("hello")


                //   var pos =   text.search('google')

                // Recreate the response so we can modify the headers
                // response = new Response(response.body, response)
                // Set CORS headers
                // response.headers.set('Access-Control-Allow-Origin', '*')

                // Append to/Add Vary header so browser will cache response correctly
                // response.headers.append('Vary', 'Origin')



                // return response





            }


        }

        //  console.log(`${element.getAttribute('href')}`)

    }

    comments(comment) {
        // An incoming comment
    }

    text(text) {
        // An incoming piece of text
    }
}


function getlinks(src) {
    var purelink = []
    let hreflinks = src.match(/href\s*?=\s*?('|").+?('|")/g) || [];


    // ref: https://stackoverflow.com/questions/3010840/loop-through-an-array-in-javascript
    for (link of hreflinks) {
        link = link.match(/(http|https).+?('|"|&amp;)/) || [];

        if (link.length > 0 && !ignorepattern.test(link[0])) {
            if (link[0].charAt(link[0].length - 1) == ';') {
                link[0] = link[0].substring(0, link[0].length - 5)
            }
            else {
                link[0] = link[0].substring(0, link[0].length - 1)
            }
            purelink.push(unescape(link[0]))


        }

    }

    return Array.from(new Set(purelink));



}

*/


/*

class DocumentHandler {
  doctype(doctype) {
    // An incoming doctype, such as <!DOCTYPE html>
  }

  comments(comment) {
    // An incoming comment
  }

  text(text) {
    // An incoming piece of text

  }

  end(end) {
    // The end of the document
  }
}

class ElementHandler {
  element(element) {
      if(element.tagName == 'script' || element.tagName == 'style')
        element.remove()
      else if(element.tagName != 'html')
        element.removeAndKeepContent()
  }

  comments(comment) {
    // An incoming comment
  }

  text(text) {
    // An incoming piece of text
  }
}
*/
