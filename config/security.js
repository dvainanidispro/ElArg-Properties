import helmet from "helmet";


/**
 * Helmet middleware for setting security-related HTTP headers.
 * Defaults: https://www.npmjs.com/package/helmet
 */
const SecurityHelmet = helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "style-src": ["'self'", "https:", "'unsafe-inline'"],
            "script-src": ["'self'", "www.gstatic.com", "ajax.googleapis.com", "cdn.jsdelivr.net", "cdn.sheetjs.com", "'unsafe-inline'", "'unsafe-eval'"], // 'unsafe-eval' for Alpine
            "script-src-attr": ["'unsafe-inline'"],     // 'none' prevent scripts in html attributes (onclick, img onerror, etc.)
            "img-src": ["*", "data:"],      // without "data:", we get a Bootstrap svg error
            upgradeInsecureRequests: [],
        },
    },
    referrerPolicy: { policy: "same-origin" },    // strict-origin-when-cross-origin (default) |  same-origin
    xFrameOptions: { action: "deny" },               // X-Frame-Options, deny framing
    crossOriginEmbedderPolicy: true,        // if true, everything on my page is CORS (crossorigin="anonymous")
    // crossOriginResourcePolicy: { policy: "same-site" },  // CORP: same-site (default) | same-origin | cross-origin
    // helmet also sets: Strict-Transport-Security, X-Content-Type-Options, X-XSS-Protection
});

/**
 * Custom middleware for additional security headers.
 */
const SecurityHeaders = (req, res, next) => {
    res.header('Permissions-Policy', "camera=(),microphone=(),fullscreen=*, clipboard-write=*");       // do not allow these with =()
    // res.header('Access-Control-Allow-Origin', "*");             // The * is safe, unless you run it on an intranet
    next();
};

/**
 * Array of security middlewares to be used in Express app.
 * @type {Array<Function>}
 */
const Security = [SecurityHelmet, SecurityHeaders];

export default Security;
