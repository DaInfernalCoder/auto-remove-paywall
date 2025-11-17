// ==UserScript==
// @name            Paywall redirect to Archive.today
// @name:de         Paywall weiterleitung auf Archive.today
// @namespace       https://greasyfork.org/en/users/20068-cuzi
// @version         3.01
// @description     Redirect major paywall sites (Economist, Atlantic, WashPost, WSJ, FT, Bloomberg, New Yorker, Spiegel, Zeit, etc.) to archive.today
// @description:de  Leitet Paywall-Seiten automatisch auf archive.today
// @icon            https://spiegel.de/favicon.ico
// @author          cuzi
// @license         GPL-3.0-or-later

// @match           https://www.spiegel.de/*
// @match           https://www.zeit.de/*
// @match           https://www.zerohedge.com/*
// @match           https://www.faz.net/*
// @match           https://m.faz.net/*
// @match           https://www.sueddeutsche.de/*
// @match           https://sz-magazin.sueddeutsche.de/*
// @match           https://www.tagesspiegel.de/*
// @match           https://nytimes.com/*
// @match           https://www.nytimes.com/*
// @match           https://www.heise.de/*
// @match           https://www.bild.de/*
// @match           https://www.economist.com/*
// @match           https://www.theatlantic.com/*
// @match           https://www.washingtonpost.com/*
// @match           https://www.wsj.com/*
// @match           https://www.ft.com/*
// @match           https://www.bloomberg.com/*
// @match           https://www.newyorker.com/*

// @match           https://archive.today/*
// @match           https://archive.ph/*
// @match           https://archive.is/*
// @match           https://archive.fo/*
// @match           https://archive.li/*
// @match           https://archive.md/*
// @match           https://archive.vn/*
// @grant           GM.registerMenuCommand
// @grant           GM.xmlHttpRequest
// @connect         archive.today
// @connect         archive.ph
// @connect         archive.is
// @connect         archive.fo
// @connect         archive.li
// @connect         archive.md
// @connect         archive.vn
// @downloadURL https://update.greasyfork.org/scripts/463339/Paywall%20redirect%20to%20Archivetoday.user.js
// @updateURL https://update.greasyfork.org/scripts/463339/Paywall%20redirect%20to%20Archivetoday.meta.js
// ==/UserScript==

/* jshint asi: true, esversion: 8 */

(async function () {
  'use strict'

  const scriptName = 'Paywall redirect to Archive.today'

  const hostnames = [
    'archive.is',
    'archive.ph',
    'archive.today',
    'archive.fo',
    'archive.li',
    'archive.md',
    'archive.vn'
  ]

  function sleep (t) {
    return new Promise(resolve => setTimeout(resolve, t))
  }

  function checkAvailability (hostname) {
    return new Promise(function (resolve, reject) {
      const onResponse = function (response) {
        if ((response.status >= 200 && response.status <= 400) || response.status === 429) {
          resolve(response)
        } else {
          reject(new Error('HOST_UNAVAILABLE'))
        }
      }
      GM.xmlHttpRequest({
        url: `https://${hostname}/`,
        method: 'GET',
        timeout: 5000,
        headers: {
          Range: 'bytes=0-63'
        },
        onload: onResponse,
        ontimeout: onResponse,
        onerror: onResponse
      })
    })
  }

  function showSpinner (msg) {
    let style = document.getElementById('check_host_style')
    if (!style) {
      style = document.head.appendChild(document.createElement('style'))
      style.setAttribute('id', 'check_host_style')
      style.textContent = `
        #check_host_spinner {
          position: fixed;
          background: #fff;
          height: 2.2em;
          top: 1em;
          left: 50%;
          transform: translate(-50%, 0);
          z-index: 10000;
          border-radius: 5px;
          border: 1px solid black;
          color: black;
          min-width: 7em;
          padding:3px;
        }
        #check_host_spinner .spinner-element {
          animation-duration: 1s;
          animation-iteration-count: infinite;
          animation-name: slide;
          animation-timing-function: linear;
          animation-direction: alternate-reverse;
          animation-play-state: running;
          background-color: #000;
          border-radius: 50%;
          border: 2px solid #fff;
          color: #fff;
          height: 1em;
          margin: auto;
          margin-left: 0;
          width: 1em;
          margin-top: -0.5em;
        }

        @keyframes slide {
          from {
            margin-left:0
          }
          to {
            margin-left:80%
          }
        }
      `
    }

    let div = document.getElementById('check_host_spinner')
    if (!div) {
      div = document.body.appendChild(document.createElement('div'))
      div.setAttribute('id', 'check_host_spinner')
      const text = div.appendChild(document.createElement('span'))
      text.setAttribute('id', 'check_host_text')
      const spinner = div.appendChild(document.createElement('div'))
      spinner.classList.add('spinner-element')
    }
    document.getElementById('check_host_text').innerHTML = msg || ''
    document.querySelector('#check_host_spinner .spinner-element').style.display = 'block'
  }

  function stopSpinner () {
    const e = document.querySelector('#check_host_spinner .spinner-element')
    if (e) {
      e.style.display = 'none'
    }
  }

  async function archivePage (url) {
    console.log('[Paywall Script] Starting archive process for:', url);
    window.setTimeout(() => showSpinner('archive'), 0)

    // Check which hostname of archive is currently available
    let workingHostname = null
    for (const hostname of hostnames) {
      try {
        console.log('[Paywall Script] Checking availability:', hostname);
        window.setTimeout(() => showSpinner(hostname), 0)
        await checkAvailability(hostname)
        workingHostname = hostname
        console.log('[Paywall Script] Found working hostname:', hostname);
        break
      } catch (err) {
        if (err && 'message' in err && err.message === 'HOST_UNAVAILABLE') {
          console.debug(`[Paywall Script] ${hostname} is NOT available`)
        } else {
          console.error('[Paywall Script] Error checking hostname:', err);
          throw err
        }
      }
    }

    if (workingHostname) {
      let redirectUrl = `https://${workingHostname}/?run=1&url=${encodeURIComponent(url)}`
      console.log('[Paywall Script] Redirecting to:', redirectUrl);

      // Try multiple redirect methods for better compatibility
      try {
        // Method 1: Standard redirect (most compatible)
        window.location.href = redirectUrl;
      } catch (e1) {
        console.error('[Paywall Script] Method 1 failed:', e1);
        try {
          // Method 2: Replace (no history entry)
          window.location.replace(redirectUrl);
        } catch (e2) {
          console.error('[Paywall Script] Method 2 failed:', e2);
          try {
            // Method 3: Assign
            window.location.assign(redirectUrl);
          } catch (e3) {
            console.error('[Paywall Script] All redirect methods failed:', e3);
            // Fallback: Show clickable link
            window.setTimeout(() => {
              showSpinner(`<a href="${redirectUrl}" style="color: blue; text-decoration: underline;">Click here to view archived page</a>`)
              stopSpinner()
            }, 200)
          }
        }
      }

    } else {
      console.warn('[Paywall Script] No working archive hostname found');
      window.setTimeout(() => {
        showSpinner(`<a href="https://archive.today/?run=1&url=${encodeURIComponent(url)}">Try archive.today</a>`)
        stopSpinner()
      }, 200)
      window.alert(scriptName +
        '\n\nSorry, all of the archive.today domains seem to be down.\n\nChecked:\n' +
        hostnames.join('\n') +
        '\n\nIf you are using a Cloudflare DNS, try to switch to another DNS provider or use a VPN. Currently Cloudflare can\'t reliably resolve archive.today.')
    }
  }

  GM.registerMenuCommand(scriptName + ' - Archive.today page', () => archivePage(document.location.href))

  let running = false
  let firstRun = true

  async function main () {
    if (running) {
      console.log('[Paywall Script] Already running, skipping');
      return
    }

    console.log('[Paywall Script] Main function started on:', document.location.hostname);

    const sites = [
      {
        hostname: 'bild.de',
        check: (doc) => {
            return doc.querySelector('ps-lefty-next-web')
        }
      },
      {
        hostname: 'heise.de',
        check: (doc) => {
          return doc.querySelector('.js-upscore-article-content-for-paywall')
        }
      },
      {
        hostname: 'spiegel',
        check: (doc) => {
          return doc.location.pathname.length > 1 && (
              doc.querySelector('[data-area="paywall"]') || (
                  doc.querySelector('#Inhalt article header #spon-spplus-flag-l') &&
                  doc.querySelectorAll('article h2').length === 1
              )
          )
        }
      },
      {
        hostname: 'tagesspiegel',
        check: (doc) => {
          return doc.querySelectorAll('#paywall').length !== 0
        }
      },
      {
        hostname: 'zeit.de',
        check: (doc, win) => {
          return doc.location.pathname.length > 1 && (
              doc.querySelector('.zplus-badge__link') ||
              (doc.getElementById('paywall')?.childElementCount ?? 0) !== 0 ||
              ('k5aMeta' in win && win.k5aMeta.paywall === 'hard')
          )
        }
      },
      {
        hostname: '.faz.net',
        waitOnFirstRun: true,
        check: (doc) => {
          return doc.location.pathname.endsWith('.html') &&
              doc.querySelectorAll('.atc-HeadlineText').length === 1 && (
                  doc.querySelector('[class*=atc-ContainerPaywall]') || // desktop  www.faz.net
                  doc.querySelector('[id*=paywall]') // mobile m.faz.net
              )
        }
      },
      {
        hostname: 'zerohedge.com',
        check: (doc, win) => {
          return doc.location.pathname.length > 1 && (
              doc.querySelector('[class*=PremiumOverlay] [class*=PremiumOverlay]') ||
              ('__NEXT_DATA__' in win && win.__NEXT_DATA__.props?.pageProps?.node?.isPremium === true)
          )
        }
      },
      {
        hostname: 'sz-magazin.sueddeutsche.de',
        check: (doc) => {
          return doc.location.search.includes('reduced=true') &&
              doc.querySelector('.articlemain__inner--reduced .paragraph--reduced')
        }
      },
      {
        hostname: 'sueddeutsche.de',
        check: (doc) => {
          return doc.location.search.includes('reduced=true') &&
              doc.querySelector('#sz-paywall iframe')
        }
      },
      {
        hostname: 'nytimes.com',
        check: (doc) => {
          return doc.querySelector('iframe[src*="captcha"]') ||
              doc.querySelector('#gateway-content') ||
              doc.querySelector('[data-testid="inline-message"]')
        }
      },
      // HIGH-VALUE SITES - UPDATED
      {
        hostname: 'economist.com',
        check: (doc) => {
          return doc.querySelector('#tp-regwall') ||
              doc.querySelector('[data-testid="regwall"]') ||
              doc.querySelector('teg-inline-wall') ||
              doc.querySelector('[class*="paywall"]') ||
              doc.querySelector('[data-test-id="paywall"]') ||
              doc.querySelector('.sp-message-open') ||
              (doc.body && doc.body.classList.contains('sp-message-open')) ||
              doc.querySelector('[aria-label*="regwall"]') ||
              doc.querySelector('#regwall-page')
        }
      },
      {
        hostname: 'theatlantic.com',
          check: (doc) => {
              return doc.querySelector('[data-zephr-sdk-feature-slug="article"]') ||
                  doc.querySelector('[data-zephr-inview]') ||
                  doc.querySelector('[data-testid="paywall"]') ||
                  doc.querySelector('[class*="Paywall"]') ||
                  doc.querySelector('.c-article-gating') ||
                  doc.querySelector('[class*="RegistrationGate"]')
          }
      },
      {
        hostname: 'washingtonpost.com',
        check: (doc) => {
          return doc.querySelector('[data-qa="subscribe-promo"]') ||
              doc.querySelector('.s-modal') ||
              doc.querySelector('[class*="paywall"]') ||
              doc.querySelector('#arc-offer') ||
              Array.from(doc.querySelectorAll('div')).some(el =>
                el.textContent.match(/You have \d+ free article/i) ||
                el.textContent.match(/Sign in to continue reading/i)
              )
        }
      },
      {
        hostname: 'wsj.com',
        check: (doc) => {
          return doc.querySelector('[class*="snippet"]') ||
              doc.querySelector('[data-type="paywall"]') ||
              doc.querySelector('.snippet-promotion') ||
              (doc.body && doc.body.classList.contains('is-snippet'))
        }
      },
      {
        hostname: 'ft.com',
        waitOnFirstRun: true,
        check: (doc) => {
          return doc.querySelector('.barrier-container') ||
              doc.querySelector('[data-trackable*="barrier"]') ||
              doc.querySelector('.js-article-ribbon') ||
              doc.querySelector('[class*="Barrier"]')
        }
      },
      {
        hostname: 'bloomberg.com',
        check: (doc) => {
          return doc.querySelector('[class*="paywall"]') ||
              doc.querySelector('[data-component="paywall"]') ||
              doc.querySelector('.fence-body') ||
              Array.from(doc.querySelectorAll('div')).some(el =>
                el.textContent.match(/Subscribe to continue/i) ||
                el.textContent.match(/articles? remaining/i)
              )
        }
      },
      {
        hostname: 'newyorker.com',
        check: (doc) => {
          return doc.querySelector('[data-testid="paywall"]') ||
              doc.querySelector('.paywall') ||
              doc.querySelector('[class*="Paywall"]') ||
              doc.querySelector('[data-journey="paywall"]')
        }
      },
      // Archive site handlers
      {
        hostname: 'archive',
        check: (doc) => {
          return doc.querySelector('form#submiturl [type=submit]')
        },
        action: (doc) => {
          console.log('[Paywall Script] Auto-submitting archive form');
          const inputField = doc.querySelector('form#submiturl input#url')
          const submitButton = doc.querySelector('form#submiturl [type=submit]')
          const m = doc.location.search.match(/url=([^&]+)/)
          if (submitButton && inputField && m) {
            inputField.value = decodeURIComponent(m[1])
            console.log('[Paywall Script] Filled form with:', inputField.value);
            submitButton.click()
            console.log('[Paywall Script] Clicked submit button');
          }
        }
      },
      {
        hostname: 'archive',
        check: (doc) => {
          return doc.querySelector('#DIVALREADY2') || doc.querySelector('#ALREADY_CLOSEBTN')
        },
        action: (doc) => {
          console.log('[Paywall Script] Closing "already archived" popup');
          const closeBtn = doc.querySelector('#ALREADY_CLOSEBTN')
          const popup = doc.querySelector('#DIVALREADY') || doc.querySelector('#DIVALREADY2')

          if (closeBtn) {
            closeBtn.click()
            console.log('[Paywall Script] Clicked close button');
          } else if (popup) {
            popup.style.display = 'none'
            console.log('[Paywall Script] Hidden popup directly');
          }
        }
      },
      {
        hostname: 'archive',
        check: (doc, win) => {
          const input = doc.querySelector('#HEADER form input[name="q"]');
          if (!input || !input.value) return false;

          let inputHostname
          try {
            const url = new URL(input.value)
            inputHostname = url.hostname
          } catch (err) {
            console.warn('[Paywall Script] Invalid URL in archive input:', input.value)
            return false
          }

          return sites.some(site =>
              site.hostname !== 'archive' &&
              inputHostname.includes(site.hostname) &&
              site.check(doc, win)
          )
        },
        action: (doc, win) => {
          console.log('[Paywall Script] Paywall detected in archive, redirecting to history');
          const key = doc.location.href
          const alreadyRedirected = win.sessionStorage.getItem(key)
          const historyLink = Array.from(doc.querySelectorAll('#HEADER form a'))
              .find(e => e.textContent.includes('history'))

          if (!alreadyRedirected && historyLink) {
            win.sessionStorage.setItem(key, '1')
            historyLink.click()
          }
        }
      }
    ]

    for (const site of sites) {
      if (document.location.hostname.includes(site.hostname)) {
        console.log('[Paywall Script] Matched site:', site.hostname);

        const shouldWait = firstRun && site.waitOnFirstRun

        if (shouldWait) {
          console.log('[Paywall Script] Waiting 3 seconds (waitOnFirstRun)');
          firstRun = false
          await sleep(3000)
          break
        }

        const result = await site.check(document, window)
        console.log('[Paywall Script] Check result for', site.hostname, ':', result);

        if (result) {
          running = true
          console.log('[Paywall Script] Paywall detected! Executing action...');

          if (typeof site.action === 'function') {
            console.log('[Paywall Script] Running custom action');
            site.action(document, window)
          } else {
            console.log('[Paywall Script] Running archivePage');
            await archivePage(document.location.href)
          }

          break
        } else {
          console.log('[Paywall Script] No paywall detected for', site.hostname);
        }
      }
    }
    firstRun = false
    console.log('[Paywall Script] Main function completed');
  }

  await main()
  await sleep(1000)
  await main()
  await sleep(5000)
  await main()
})()