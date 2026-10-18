(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [2733, 7029],
  {
    25884: function (e, t, n) {
      Promise.resolve().then(n.bind(n, 86206));
    },
    1295: function (e, t, n) {
      "use strict";
      Object.defineProperty(t, "__esModule", { value: !0 }),
        (function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
        })(t, {
          default: function () {
            return l;
          },
          unstable_getImgProps: function () {
            return u;
          },
        });
      let r = n(21024),
        a = n(32301),
        i = n(27873),
        o = n(63222),
        s = r._(n(75033)),
        u = (e) => {
          (0, i.warnOnce)(
            "Warning: unstable_getImgProps() is experimental and may change or be removed at any time. Use at your own risk.",
          );
          let { props: t } = (0, a.getImgProps)(e, {
            defaultLoader: s.default,
            imgConf: {
              deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
              imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
              path: "/_next/image",
              loader: "default",
              dangerouslyAllowSVG: !1,
              unoptimized: !1,
            },
          });
          for (let [e, n] of Object.entries(t)) void 0 === n && delete t[e];
          return { props: t };
        },
        l = o.Image;
    },
    22706: function (e, t, n) {
      "use strict";
      Object.defineProperty(t, "__esModule", { value: !0 }),
        Object.defineProperty(t, "RouterContext", {
          enumerable: !0,
          get: function () {
            return i;
          },
        });
      let r = n(21024),
        a = r._(n(2265)),
        i = a.default.createContext(null);
    },
    86206: function (e, t, n) {
      "use strict";
      n.r(t),
        n.d(t, {
          default: function () {
            return l;
          },
        });
      var r = n(57437);
      n(2265);
      var a = n(16691),
        i = n.n(a),
        o = n(67454),
        s = {
          src: "/_next/static/media/system_logo.93214d2d.svg",
          height: 155,
          width: 484,
          blurWidth: 0,
          blurHeight: 0,
        },
        u = n(24033),
        l = () => {
          let e = (0, u.usePathname)();
          return e.includes("feedback")
            ? null
            : (0, r.jsx)("header", {
                className: "bg-[#fff] shadow h-20",
                children: (0, r.jsxs)("div", {
                  className:
                    "container mx-auto flex justify-between items-center h-full",
                  children: [
                    (0, r.jsx)("a", {
                      href: "/",
                      children: (0, r.jsx)(i(), {
                        alt: "Imagem da logo ESG ".concat("FIEMS"),
                        src: o.Z,
                        height: 50,
                      }),
                    }),
                    (0, r.jsx)("nav", {
                      className: "flex items-center gap-6",
                      children: (0, r.jsx)("a", {
                        href: "https://www.ms.senai.br/",
                        target: "_blank",
                        children: (0, r.jsx)(i(), {
                          alt: "Imagem da logo do sistema ".concat("FIEMS"),
                          src: s,
                          height: 70,
                        }),
                      }),
                    }),
                  ],
                }),
              });
        };
    },
    67454: function (e, t) {
      "use strict";
      t.Z = {
        src: "/_next/static/media/esg_logo_horizontal.04f1a5bc.png",
        height: 246,
        width: 1270,
        blurDataURL:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAACCAMAAABSSm3fAAAAGFBMVEUOMH0MLX2ByukNLnwOMH4LLH8KLn0ILHulJVGbAAAACHRSTlMniS03TFZHWwubAIgAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAaSURBVHicY2BiZmFmY2RkZGBiYGBgYGFnBQABaAAoboAsbQAAAABJRU5ErkJggg==",
        blurWidth: 8,
        blurHeight: 2,
      };
    },
    30622: function (e, t, n) {
      "use strict";
      /**
       * @license React
       * react-jsx-runtime.production.min.js
       *
       * Copyright (c) Meta Platforms, Inc. and affiliates.
       *
       * This source code is licensed under the MIT license found in the
       * LICENSE file in the root directory of this source tree.
       */ var r = n(2265),
        a = Symbol.for("react.element"),
        i = Symbol.for("react.fragment"),
        o = Object.prototype.hasOwnProperty,
        s =
          r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
            .ReactCurrentOwner,
        u = { key: !0, ref: !0, __self: !0, __source: !0 };
      function l(e, t, n) {
        var r,
          i = {},
          l = null,
          c = null;
        for (r in (void 0 !== n && (l = "" + n),
        void 0 !== t.key && (l = "" + t.key),
        void 0 !== t.ref && (c = t.ref),
        t))
          o.call(t, r) && !u.hasOwnProperty(r) && (i[r] = t[r]);
        if (e && e.defaultProps)
          for (r in (t = e.defaultProps)) void 0 === i[r] && (i[r] = t[r]);
        return {
          $$typeof: a,
          type: e,
          key: l,
          ref: c,
          props: i,
          _owner: s.current,
        };
      }
      (t.Fragment = i), (t.jsx = l), (t.jsxs = l);
    },
    57437: function (e, t, n) {
      "use strict";
      e.exports = n(30622);
    },
    16691: function (e, t, n) {
      e.exports = n(1295);
    },
    24033: function (e, t, n) {
      e.exports = n(68165);
    },
  },
  function (e) {
    e.O(0, [3222, 2971, 596, 1744], function () {
      return e((e.s = 25884));
    }),
      (_N_E = e.O());
  },
]);
