import crypto from "crypto";

import { handleError } from "../utils/errorHandler.js";

const renderTurnstileHtml = ({ siteKey, nonce }) => `<!DOCTYPE html>
<html lang="ar">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
      async
      defer
    ></script>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <div id="widget"></div>
    <script nonce="${nonce}">
      function postToApp(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      window.onTurnstileLoad = function () {
        turnstile.render("#widget", {
          sitekey: "${siteKey}",
          theme: "auto",
          callback: function (token) {
            postToApp({ type: "turnstile-token", token: token });
          },
          "error-callback": function () {
            postToApp({ type: "turnstile-error" });
          },
          "expired-callback": function () {
            postToApp({ type: "turnstile-expired" });
          },
        });
      };
    </script>
  </body>
</html>
`;

export const renderTurnstileWidget = (req, res) => {
  try {
    const siteKey = process.env.TURNSTILE_SITE_KEY;
    if (!siteKey) {
      throw new Error("TURNSTILE_SITE_KEY_MISSING");
    }

    const nonce = crypto.randomBytes(16).toString("base64");

    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        `script-src 'self' https://challenges.cloudflare.com 'nonce-${nonce}'`,
        "style-src 'self' 'unsafe-inline'",
        "frame-src https://challenges.cloudflare.com",
        "connect-src 'self' https://challenges.cloudflare.com",
        "img-src 'self' data: https://challenges.cloudflare.com",
      ].join("; "),
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    return res.status(200).send(renderTurnstileHtml({ siteKey, nonce }));
  } catch (err) {
    return handleError(err, res);
  }
};
