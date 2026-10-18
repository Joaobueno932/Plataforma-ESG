"use strict";
(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [3342],
  {
    85859: function (e, t, n) {
      n.d(t, {
        Ry: function () {
          return c;
        },
      });
      var r = new WeakMap(),
        o = new WeakMap(),
        i = {},
        l = 0,
        a = function (e) {
          return e && (e.host || a(e.parentNode));
        },
        u = function (e, t, n, u) {
          var c = (Array.isArray(e) ? e : [e])
            .map(function (e) {
              if (t.contains(e)) return e;
              var n = a(e);
              return n && t.contains(n)
                ? n
                : (console.error(
                    "aria-hidden",
                    e,
                    "in not contained inside",
                    t,
                    ". Doing nothing",
                  ),
                  null);
            })
            .filter(function (e) {
              return !!e;
            });
          i[n] || (i[n] = new WeakMap());
          var s = i[n],
            d = [],
            f = new Set(),
            p = new Set(c),
            m = function (e) {
              !e || f.has(e) || (f.add(e), m(e.parentNode));
            };
          c.forEach(m);
          var v = function (e) {
            !e ||
              p.has(e) ||
              Array.prototype.forEach.call(e.children, function (e) {
                if (f.has(e)) v(e);
                else {
                  var t = e.getAttribute(u),
                    i = null !== t && "false" !== t,
                    l = (r.get(e) || 0) + 1,
                    a = (s.get(e) || 0) + 1;
                  r.set(e, l),
                    s.set(e, a),
                    d.push(e),
                    1 === l && i && o.set(e, !0),
                    1 === a && e.setAttribute(n, "true"),
                    i || e.setAttribute(u, "true");
                }
              });
          };
          return (
            v(t),
            f.clear(),
            l++,
            function () {
              d.forEach(function (e) {
                var t = r.get(e) - 1,
                  i = s.get(e) - 1;
                r.set(e, t),
                  s.set(e, i),
                  t || (o.has(e) || e.removeAttribute(u), o.delete(e)),
                  i || e.removeAttribute(n);
              }),
                --l ||
                  ((r = new WeakMap()),
                  (r = new WeakMap()),
                  (o = new WeakMap()),
                  (i = {}));
            }
          );
        },
        c = function (e, t, n) {
          void 0 === n && (n = "data-aria-hidden");
          var r = Array.from(Array.isArray(e) ? e : [e]),
            o =
              t ||
              ("undefined" == typeof document
                ? null
                : (Array.isArray(e) ? e[0] : e).ownerDocument.body);
          return o
            ? (r.push.apply(r, Array.from(o.querySelectorAll("[aria-live]"))),
              u(r, o, n, "aria-hidden"))
            : function () {
                return null;
              };
        };
    },
    73386: function (e, t, n) {
      n.d(t, {
        Z: function () {
          return z;
        },
      });
      var r,
        o,
        i,
        l,
        a,
        u,
        c = function () {
          return (c =
            Object.assign ||
            function (e) {
              for (var t, n = 1, r = arguments.length; n < r; n++)
                for (var o in (t = arguments[n]))
                  Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
              return e;
            }).apply(this, arguments);
        };
      function s(e, t) {
        var n = {};
        for (var r in e)
          Object.prototype.hasOwnProperty.call(e, r) &&
            0 > t.indexOf(r) &&
            (n[r] = e[r]);
        if (null != e && "function" == typeof Object.getOwnPropertySymbols)
          for (
            var o = 0, r = Object.getOwnPropertySymbols(e);
            o < r.length;
            o++
          )
            0 > t.indexOf(r[o]) &&
              Object.prototype.propertyIsEnumerable.call(e, r[o]) &&
              (n[r[o]] = e[r[o]]);
        return n;
      }
      "function" == typeof SuppressedError && SuppressedError;
      var d = n(2265),
        f = "right-scroll-bar-position",
        p = "width-before-scroll-bar",
        m =
          (void 0 === r && (r = {}),
          ((void 0 === o &&
            (o = function (e) {
              return e;
            }),
          (i = []),
          (l = !1),
          (a = {
            read: function () {
              if (l)
                throw Error(
                  "Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.",
                );
              return i.length ? i[i.length - 1] : null;
            },
            useMedium: function (e) {
              var t = o(e, l);
              return (
                i.push(t),
                function () {
                  i = i.filter(function (e) {
                    return e !== t;
                  });
                }
              );
            },
            assignSyncMedium: function (e) {
              for (l = !0; i.length; ) {
                var t = i;
                (i = []), t.forEach(e);
              }
              i = {
                push: function (t) {
                  return e(t);
                },
                filter: function () {
                  return i;
                },
              };
            },
            assignMedium: function (e) {
              l = !0;
              var t = [];
              if (i.length) {
                var n = i;
                (i = []), n.forEach(e), (t = i);
              }
              var r = function () {
                  var n = t;
                  (t = []), n.forEach(e);
                },
                o = function () {
                  return Promise.resolve().then(r);
                };
              o(),
                (i = {
                  push: function (e) {
                    t.push(e), o();
                  },
                  filter: function (e) {
                    return (t = t.filter(e)), i;
                  },
                });
            },
          })).options = c({ async: !0, ssr: !1 }, r)),
          a),
        v = function () {},
        h = d.forwardRef(function (e, t) {
          var n,
            r,
            o,
            i = d.useRef(null),
            l = d.useState({
              onScrollCapture: v,
              onWheelCapture: v,
              onTouchMoveCapture: v,
            }),
            a = l[0],
            u = l[1],
            f = e.forwardProps,
            p = e.children,
            h = e.className,
            g = e.removeScrollBar,
            y = e.enabled,
            w = e.shards,
            b = e.sideCar,
            x = e.noIsolation,
            E = e.inert,
            C = e.allowPinchZoom,
            S = e.as,
            R = void 0 === S ? "div" : S,
            k = s(e, [
              "forwardProps",
              "children",
              "className",
              "removeScrollBar",
              "enabled",
              "shards",
              "sideCar",
              "noIsolation",
              "inert",
              "allowPinchZoom",
              "as",
            ]),
            T =
              ((n = [i, t]),
              (r = function (e) {
                return n.forEach(function (t) {
                  return (
                    "function" == typeof t ? t(e) : t && (t.current = e), t
                  );
                });
              }),
              ((o = (0, d.useState)(function () {
                return {
                  value: null,
                  callback: r,
                  facade: {
                    get current() {
                      return o.value;
                    },
                    set current(value) {
                      var e = o.value;
                      e !== value && ((o.value = value), o.callback(value, e));
                    },
                  },
                };
              })[0]).callback = r),
              o.facade),
            P = c(c({}, k), a);
          return d.createElement(
            d.Fragment,
            null,
            y &&
              d.createElement(b, {
                sideCar: m,
                removeScrollBar: g,
                shards: w,
                noIsolation: x,
                inert: E,
                setCallbacks: u,
                allowPinchZoom: !!C,
                lockRef: i,
              }),
            f
              ? d.cloneElement(d.Children.only(p), c(c({}, P), { ref: T }))
              : d.createElement(R, c({}, P, { className: h, ref: T }), p),
          );
        });
      (h.defaultProps = { enabled: !0, removeScrollBar: !0, inert: !1 }),
        (h.classNames = { fullWidth: p, zeroRight: f });
      var g = function (e) {
        var t = e.sideCar,
          n = s(e, ["sideCar"]);
        if (!t)
          throw Error(
            "Sidecar: please provide `sideCar` property to import the right car",
          );
        var r = t.read();
        if (!r) throw Error("Sidecar medium not found");
        return d.createElement(r, c({}, n));
      };
      g.isSideCarExport = !0;
      var y = function () {
          var e = 0,
            t = null;
          return {
            add: function (r) {
              if (
                0 == e &&
                (t = (function () {
                  if (!document) return null;
                  var e = document.createElement("style");
                  e.type = "text/css";
                  var t = u || n.nc;
                  return t && e.setAttribute("nonce", t), e;
                })())
              ) {
                var o, i;
                (o = t).styleSheet
                  ? (o.styleSheet.cssText = r)
                  : o.appendChild(document.createTextNode(r)),
                  (i = t),
                  (
                    document.head || document.getElementsByTagName("head")[0]
                  ).appendChild(i);
              }
              e++;
            },
            remove: function () {
              --e ||
                !t ||
                (t.parentNode && t.parentNode.removeChild(t), (t = null));
            },
          };
        },
        w = function () {
          var e = y();
          return function (t, n) {
            d.useEffect(
              function () {
                return (
                  e.add(t),
                  function () {
                    e.remove();
                  }
                );
              },
              [t && n],
            );
          };
        },
        b = function () {
          var e = w();
          return function (t) {
            return e(t.styles, t.dynamic), null;
          };
        },
        x = { left: 0, top: 0, right: 0, gap: 0 },
        E = function (e) {
          return parseInt(e || "", 10) || 0;
        },
        C = function (e) {
          var t = window.getComputedStyle(document.body),
            n = t["padding" === e ? "paddingLeft" : "marginLeft"],
            r = t["padding" === e ? "paddingTop" : "marginTop"],
            o = t["padding" === e ? "paddingRight" : "marginRight"];
          return [E(n), E(r), E(o)];
        },
        S = function (e) {
          if ((void 0 === e && (e = "margin"), "undefined" == typeof window))
            return x;
          var t = C(e),
            n = document.documentElement.clientWidth,
            r = window.innerWidth;
          return {
            left: t[0],
            top: t[1],
            right: t[2],
            gap: Math.max(0, r - n + t[2] - t[0]),
          };
        },
        R = b(),
        k = function (e, t, n, r) {
          var o = e.left,
            i = e.top,
            l = e.right,
            a = e.gap;
          return (
            void 0 === n && (n = "margin"),
            "\n  ."
              .concat("with-scroll-bars-hidden", " {\n   overflow: hidden ")
              .concat(r, ";\n   padding-right: ")
              .concat(a, "px ")
              .concat(r, ";\n  }\n  body {\n    overflow: hidden ")
              .concat(r, ";\n    overscroll-behavior: contain;\n    ")
              .concat(
                [
                  t && "position: relative ".concat(r, ";"),
                  "margin" === n &&
                    "\n    padding-left: "
                      .concat(o, "px;\n    padding-top: ")
                      .concat(i, "px;\n    padding-right: ")
                      .concat(
                        l,
                        "px;\n    margin-left:0;\n    margin-top:0;\n    margin-right: ",
                      )
                      .concat(a, "px ")
                      .concat(r, ";\n    "),
                  "padding" === n &&
                    "padding-right: ".concat(a, "px ").concat(r, ";"),
                ]
                  .filter(Boolean)
                  .join(""),
                "\n  }\n  \n  .",
              )
              .concat(f, " {\n    right: ")
              .concat(a, "px ")
              .concat(r, ";\n  }\n  \n  .")
              .concat(p, " {\n    margin-right: ")
              .concat(a, "px ")
              .concat(r, ";\n  }\n  \n  .")
              .concat(f, " .")
              .concat(f, " {\n    right: 0 ")
              .concat(r, ";\n  }\n  \n  .")
              .concat(p, " .")
              .concat(p, " {\n    margin-right: 0 ")
              .concat(r, ";\n  }\n  \n  body {\n    ")
              .concat("--removed-body-scroll-bar-size", ": ")
              .concat(a, "px;\n  }\n")
          );
        },
        T = function (e) {
          var t = e.noRelative,
            n = e.noImportant,
            r = e.gapMode,
            o = void 0 === r ? "margin" : r,
            i = d.useMemo(
              function () {
                return S(o);
              },
              [o],
            );
          return d.createElement(R, {
            styles: k(i, !t, o, n ? "" : "!important"),
          });
        },
        P = !1;
      if ("undefined" != typeof window)
        try {
          var L = Object.defineProperty({}, "passive", {
            get: function () {
              return (P = !0), !0;
            },
          });
          window.addEventListener("test", L, L),
            window.removeEventListener("test", L, L);
        } catch (e) {
          P = !1;
        }
      var M = !!P && { passive: !1 },
        A = function (e, t) {
          var n = window.getComputedStyle(e);
          return (
            "hidden" !== n[t] &&
            !(
              n.overflowY === n.overflowX &&
              "TEXTAREA" !== e.tagName &&
              "visible" === n[t]
            )
          );
        },
        O = function (e, t) {
          var n = t;
          do {
            if (
              ("undefined" != typeof ShadowRoot &&
                n instanceof ShadowRoot &&
                (n = n.host),
              W(e, n))
            ) {
              var r = D(e, n);
              if (r[1] > r[2]) return !0;
            }
            n = n.parentNode;
          } while (n && n !== document.body);
          return !1;
        },
        W = function (e, t) {
          return "v" === e ? A(t, "overflowY") : A(t, "overflowX");
        },
        D = function (e, t) {
          return "v" === e
            ? [t.scrollTop, t.scrollHeight, t.clientHeight]
            : [t.scrollLeft, t.scrollWidth, t.clientWidth];
        },
        I = function (e, t, n, r, o) {
          var i,
            l =
              ((i = window.getComputedStyle(t).direction),
              "h" === e && "rtl" === i ? -1 : 1),
            a = l * r,
            u = n.target,
            c = t.contains(u),
            s = !1,
            d = a > 0,
            f = 0,
            p = 0;
          do {
            var m = D(e, u),
              v = m[0],
              h = m[1] - m[2] - l * v;
            (v || h) && W(e, u) && ((f += h), (p += v)), (u = u.parentNode);
          } while (
            (!c && u !== document.body) ||
            (c && (t.contains(u) || t === u))
          );
          return (
            d && ((o && 0 === f) || (!o && a > f))
              ? (s = !0)
              : !d && ((o && 0 === p) || (!o && -a > p)) && (s = !0),
            s
          );
        },
        V = function (e) {
          return "changedTouches" in e
            ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY]
            : [0, 0];
        },
        _ = function (e) {
          return [e.deltaX, e.deltaY];
        },
        F = function (e) {
          return e && "current" in e ? e.current : e;
        },
        N = 0,
        H = [],
        B =
          (m.useMedium(function (e) {
            var t = d.useRef([]),
              n = d.useRef([0, 0]),
              r = d.useRef(),
              o = d.useState(N++)[0],
              i = d.useState(function () {
                return b();
              })[0],
              l = d.useRef(e);
            d.useEffect(
              function () {
                l.current = e;
              },
              [e],
            ),
              d.useEffect(
                function () {
                  if (e.inert) {
                    document.body.classList.add(
                      "block-interactivity-".concat(o),
                    );
                    var t = (function (e, t, n) {
                      if (n || 2 == arguments.length)
                        for (var r, o = 0, i = t.length; o < i; o++)
                          (!r && o in t) ||
                            (r || (r = Array.prototype.slice.call(t, 0, o)),
                            (r[o] = t[o]));
                      return e.concat(r || Array.prototype.slice.call(t));
                    })([e.lockRef.current], (e.shards || []).map(F), !0).filter(
                      Boolean,
                    );
                    return (
                      t.forEach(function (e) {
                        return e.classList.add(
                          "allow-interactivity-".concat(o),
                        );
                      }),
                      function () {
                        document.body.classList.remove(
                          "block-interactivity-".concat(o),
                        ),
                          t.forEach(function (e) {
                            return e.classList.remove(
                              "allow-interactivity-".concat(o),
                            );
                          });
                      }
                    );
                  }
                },
                [e.inert, e.lockRef.current, e.shards],
              );
            var a = d.useCallback(function (e, t) {
                if ("touches" in e && 2 === e.touches.length)
                  return !l.current.allowPinchZoom;
                var o,
                  i = V(e),
                  a = n.current,
                  u = "deltaX" in e ? e.deltaX : a[0] - i[0],
                  c = "deltaY" in e ? e.deltaY : a[1] - i[1],
                  s = e.target,
                  d = Math.abs(u) > Math.abs(c) ? "h" : "v";
                if ("touches" in e && "h" === d && "range" === s.type)
                  return !1;
                var f = O(d, s);
                if (!f) return !0;
                if (
                  (f ? (o = d) : ((o = "v" === d ? "h" : "v"), (f = O(d, s))),
                  !f)
                )
                  return !1;
                if (
                  (!r.current &&
                    "changedTouches" in e &&
                    (u || c) &&
                    (r.current = o),
                  !o)
                )
                  return !0;
                var p = r.current || o;
                return I(p, t, e, "h" === p ? u : c, !0);
              }, []),
              u = d.useCallback(function (e) {
                if (H.length && H[H.length - 1] === i) {
                  var n = "deltaY" in e ? _(e) : V(e),
                    r = t.current.filter(function (t) {
                      var r;
                      return (
                        t.name === e.type &&
                        t.target === e.target &&
                        (r = t.delta)[0] === n[0] &&
                        r[1] === n[1]
                      );
                    })[0];
                  if (r && r.should) {
                    e.cancelable && e.preventDefault();
                    return;
                  }
                  if (!r) {
                    var o = (l.current.shards || [])
                      .map(F)
                      .filter(Boolean)
                      .filter(function (t) {
                        return t.contains(e.target);
                      });
                    (o.length > 0 ? a(e, o[0]) : !l.current.noIsolation) &&
                      e.cancelable &&
                      e.preventDefault();
                  }
                }
              }, []),
              c = d.useCallback(function (e, n, r, o) {
                var i = { name: e, delta: n, target: r, should: o };
                t.current.push(i),
                  setTimeout(function () {
                    t.current = t.current.filter(function (e) {
                      return e !== i;
                    });
                  }, 1);
              }, []),
              s = d.useCallback(function (e) {
                (n.current = V(e)), (r.current = void 0);
              }, []),
              f = d.useCallback(function (t) {
                c(t.type, _(t), t.target, a(t, e.lockRef.current));
              }, []),
              p = d.useCallback(function (t) {
                c(t.type, V(t), t.target, a(t, e.lockRef.current));
              }, []);
            d.useEffect(function () {
              return (
                H.push(i),
                e.setCallbacks({
                  onScrollCapture: f,
                  onWheelCapture: f,
                  onTouchMoveCapture: p,
                }),
                document.addEventListener("wheel", u, M),
                document.addEventListener("touchmove", u, M),
                document.addEventListener("touchstart", s, M),
                function () {
                  (H = H.filter(function (e) {
                    return e !== i;
                  })),
                    document.removeEventListener("wheel", u, M),
                    document.removeEventListener("touchmove", u, M),
                    document.removeEventListener("touchstart", s, M);
                }
              );
            }, []);
            var m = e.removeScrollBar,
              v = e.inert;
            return d.createElement(
              d.Fragment,
              null,
              v
                ? d.createElement(i, {
                    styles: "\n  .block-interactivity-"
                      .concat(
                        o,
                        " {pointer-events: none;}\n  .allow-interactivity-",
                      )
                      .concat(o, " {pointer-events: all;}\n"),
                  })
                : null,
              m ? d.createElement(T, { gapMode: "margin" }) : null,
            );
          }),
          g),
        Z = d.forwardRef(function (e, t) {
          return d.createElement(h, c({}, e, { ref: t, sideCar: B }));
        });
      Z.classNames = h.classNames;
      var z = Z;
    },
    49473: function (e, t, n) {
      n.d(t, {
        Cp: function () {
          return d;
        },
        RR: function () {
          return u;
        },
        cv: function () {
          return p;
        },
        dp: function () {
          return h;
        },
        dr: function () {
          return v;
        },
        oo: function () {
          return i;
        },
        uY: function () {
          return m;
        },
        x7: function () {
          return a;
        },
      });
      var r = n(9082);
      function o(e, t, n) {
        let o,
          { reference: i, floating: l } = e,
          a = (0, r.Qq)(t),
          u = (0, r.Wh)(t),
          c = (0, r.I4)(u),
          s = (0, r.k3)(t),
          d = "y" === a,
          f = i.x + i.width / 2 - l.width / 2,
          p = i.y + i.height / 2 - l.height / 2,
          m = i[c] / 2 - l[c] / 2;
        switch (s) {
          case "top":
            o = { x: f, y: i.y - l.height };
            break;
          case "bottom":
            o = { x: f, y: i.y + i.height };
            break;
          case "right":
            o = { x: i.x + i.width, y: p };
            break;
          case "left":
            o = { x: i.x - l.width, y: p };
            break;
          default:
            o = { x: i.x, y: i.y };
        }
        switch ((0, r.hp)(t)) {
          case "start":
            o[u] -= m * (n && d ? -1 : 1);
            break;
          case "end":
            o[u] += m * (n && d ? -1 : 1);
        }
        return o;
      }
      let i = async (e, t, n) => {
        let {
            placement: r = "bottom",
            strategy: i = "absolute",
            middleware: l = [],
            platform: a,
          } = n,
          u = l.filter(Boolean),
          c = await (null == a.isRTL ? void 0 : a.isRTL(t)),
          s = await a.getElementRects({
            reference: e,
            floating: t,
            strategy: i,
          }),
          { x: d, y: f } = o(s, r, c),
          p = r,
          m = {},
          v = 0;
        for (let n = 0; n < u.length; n++) {
          let { name: l, fn: h } = u[n],
            {
              x: g,
              y: y,
              data: w,
              reset: b,
            } = await h({
              x: d,
              y: f,
              initialPlacement: r,
              placement: p,
              strategy: i,
              middlewareData: m,
              rects: s,
              platform: a,
              elements: { reference: e, floating: t },
            });
          if (
            ((d = null != g ? g : d),
            (f = null != y ? y : f),
            (m = { ...m, [l]: { ...m[l], ...w } }),
            b && v <= 50)
          ) {
            v++,
              "object" == typeof b &&
                (b.placement && (p = b.placement),
                b.rects &&
                  (s =
                    !0 === b.rects
                      ? await a.getElementRects({
                          reference: e,
                          floating: t,
                          strategy: i,
                        })
                      : b.rects),
                ({ x: d, y: f } = o(s, p, c))),
              (n = -1);
            continue;
          }
        }
        return { x: d, y: f, placement: p, strategy: i, middlewareData: m };
      };
      async function l(e, t) {
        var n;
        void 0 === t && (t = {});
        let { x: o, y: i, platform: l, rects: a, elements: u, strategy: c } = e,
          {
            boundary: s = "clippingAncestors",
            rootBoundary: d = "viewport",
            elementContext: f = "floating",
            altBoundary: p = !1,
            padding: m = 0,
          } = (0, r.ku)(t, e),
          v = (0, r.yd)(m),
          h = u[p ? ("floating" === f ? "reference" : "floating") : f],
          g = (0, r.JB)(
            await l.getClippingRect({
              element:
                null ==
                  (n = await (null == l.isElement ? void 0 : l.isElement(h))) ||
                n
                  ? h
                  : h.contextElement ||
                    (await (null == l.getDocumentElement
                      ? void 0
                      : l.getDocumentElement(u.floating))),
              boundary: s,
              rootBoundary: d,
              strategy: c,
            }),
          ),
          y = "floating" === f ? { ...a.floating, x: o, y: i } : a.reference,
          w = await (null == l.getOffsetParent
            ? void 0
            : l.getOffsetParent(u.floating)),
          b = ((await (null == l.isElement ? void 0 : l.isElement(w))) &&
            (await (null == l.getScale ? void 0 : l.getScale(w)))) || {
            x: 1,
            y: 1,
          },
          x = (0, r.JB)(
            l.convertOffsetParentRelativeRectToViewportRelativeRect
              ? await l.convertOffsetParentRelativeRectToViewportRelativeRect({
                  rect: y,
                  offsetParent: w,
                  strategy: c,
                })
              : y,
          );
        return {
          top: (g.top - x.top + v.top) / b.y,
          bottom: (x.bottom - g.bottom + v.bottom) / b.y,
          left: (g.left - x.left + v.left) / b.x,
          right: (x.right - g.right + v.right) / b.x,
        };
      }
      let a = (e) => ({
          name: "arrow",
          options: e,
          async fn(t) {
            let {
                x: n,
                y: o,
                placement: i,
                rects: l,
                platform: a,
                elements: u,
                middlewareData: c,
              } = t,
              { element: s, padding: d = 0 } = (0, r.ku)(e, t) || {};
            if (null == s) return {};
            let f = (0, r.yd)(d),
              p = { x: n, y: o },
              m = (0, r.Wh)(i),
              v = (0, r.I4)(m),
              h = await a.getDimensions(s),
              g = "y" === m,
              y = g ? "clientHeight" : "clientWidth",
              w = l.reference[v] + l.reference[m] - p[m] - l.floating[v],
              b = p[m] - l.reference[m],
              x = await (null == a.getOffsetParent
                ? void 0
                : a.getOffsetParent(s)),
              E = x ? x[y] : 0;
            (E && (await (null == a.isElement ? void 0 : a.isElement(x)))) ||
              (E = u.floating[y] || l.floating[v]);
            let C = E / 2 - h[v] / 2 - 1,
              S = (0, r.VV)(f[g ? "top" : "left"], C),
              R = (0, r.VV)(f[g ? "bottom" : "right"], C),
              k = E - h[v] - R,
              T = E / 2 - h[v] / 2 + (w / 2 - b / 2),
              P = (0, r.uZ)(S, T, k),
              L =
                !c.arrow &&
                null != (0, r.hp)(i) &&
                T != P &&
                l.reference[v] / 2 - (T < S ? S : R) - h[v] / 2 < 0,
              M = L ? (T < S ? T - S : T - k) : 0;
            return {
              [m]: p[m] + M,
              data: {
                [m]: P,
                centerOffset: T - P - M,
                ...(L && { alignmentOffset: M }),
              },
              reset: L,
            };
          },
        }),
        u = function (e) {
          return (
            void 0 === e && (e = {}),
            {
              name: "flip",
              options: e,
              async fn(t) {
                var n, o, i, a, u;
                let {
                    placement: c,
                    middlewareData: s,
                    rects: d,
                    initialPlacement: f,
                    platform: p,
                    elements: m,
                  } = t,
                  {
                    mainAxis: v = !0,
                    crossAxis: h = !0,
                    fallbackPlacements: g,
                    fallbackStrategy: y = "bestFit",
                    fallbackAxisSideDirection: w = "none",
                    flipAlignment: b = !0,
                    ...x
                  } = (0, r.ku)(e, t);
                if (null != (n = s.arrow) && n.alignmentOffset) return {};
                let E = (0, r.k3)(c),
                  C = (0, r.k3)(f) === f,
                  S = await (null == p.isRTL ? void 0 : p.isRTL(m.floating)),
                  R = g || (C || !b ? [(0, r.pw)(f)] : (0, r.gy)(f));
                g || "none" === w || R.push(...(0, r.KX)(f, b, w, S));
                let k = [f, ...R],
                  T = await l(t, x),
                  P = [],
                  L = (null == (o = s.flip) ? void 0 : o.overflows) || [];
                if ((v && P.push(T[E]), h)) {
                  let e = (0, r.i8)(c, d, S);
                  P.push(T[e[0]], T[e[1]]);
                }
                if (
                  ((L = [...L, { placement: c, overflows: P }]),
                  !P.every((e) => e <= 0))
                ) {
                  let e = ((null == (i = s.flip) ? void 0 : i.index) || 0) + 1,
                    t = k[e];
                  if (t)
                    return {
                      data: { index: e, overflows: L },
                      reset: { placement: t },
                    };
                  let n =
                    null ==
                    (a = L.filter((e) => e.overflows[0] <= 0).sort(
                      (e, t) => e.overflows[1] - t.overflows[1],
                    )[0])
                      ? void 0
                      : a.placement;
                  if (!n)
                    switch (y) {
                      case "bestFit": {
                        let e =
                          null ==
                          (u = L.map((e) => [
                            e.placement,
                            e.overflows
                              .filter((e) => e > 0)
                              .reduce((e, t) => e + t, 0),
                          ]).sort((e, t) => e[1] - t[1])[0])
                            ? void 0
                            : u[0];
                        e && (n = e);
                        break;
                      }
                      case "initialPlacement":
                        n = f;
                    }
                  if (c !== n) return { reset: { placement: n } };
                }
                return {};
              },
            }
          );
        };
      function c(e, t) {
        return {
          top: e.top - t.height,
          right: e.right - t.width,
          bottom: e.bottom - t.height,
          left: e.left - t.width,
        };
      }
      function s(e) {
        return r.mA.some((t) => e[t] >= 0);
      }
      let d = function (e) {
        return (
          void 0 === e && (e = {}),
          {
            name: "hide",
            options: e,
            async fn(t) {
              let { rects: n } = t,
                { strategy: o = "referenceHidden", ...i } = (0, r.ku)(e, t);
              switch (o) {
                case "referenceHidden": {
                  let e = await l(t, { ...i, elementContext: "reference" }),
                    r = c(e, n.reference);
                  return {
                    data: { referenceHiddenOffsets: r, referenceHidden: s(r) },
                  };
                }
                case "escaped": {
                  let e = await l(t, { ...i, altBoundary: !0 }),
                    r = c(e, n.floating);
                  return { data: { escapedOffsets: r, escaped: s(r) } };
                }
                default:
                  return {};
              }
            },
          }
        );
      };
      async function f(e, t) {
        let { placement: n, platform: o, elements: i } = e,
          l = await (null == o.isRTL ? void 0 : o.isRTL(i.floating)),
          a = (0, r.k3)(n),
          u = (0, r.hp)(n),
          c = "y" === (0, r.Qq)(n),
          s = ["left", "top"].includes(a) ? -1 : 1,
          d = l && c ? -1 : 1,
          f = (0, r.ku)(t, e),
          {
            mainAxis: p,
            crossAxis: m,
            alignmentAxis: v,
          } = "number" == typeof f
            ? { mainAxis: f, crossAxis: 0, alignmentAxis: null }
            : { mainAxis: 0, crossAxis: 0, alignmentAxis: null, ...f };
        return (
          u && "number" == typeof v && (m = "end" === u ? -1 * v : v),
          c ? { x: m * d, y: p * s } : { x: p * s, y: m * d }
        );
      }
      let p = function (e) {
          return (
            void 0 === e && (e = 0),
            {
              name: "offset",
              options: e,
              async fn(t) {
                let { x: n, y: r } = t,
                  o = await f(t, e);
                return { x: n + o.x, y: r + o.y, data: o };
              },
            }
          );
        },
        m = function (e) {
          return (
            void 0 === e && (e = {}),
            {
              name: "shift",
              options: e,
              async fn(t) {
                let { x: n, y: o, placement: i } = t,
                  {
                    mainAxis: a = !0,
                    crossAxis: u = !1,
                    limiter: c = {
                      fn: (e) => {
                        let { x: t, y: n } = e;
                        return { x: t, y: n };
                      },
                    },
                    ...s
                  } = (0, r.ku)(e, t),
                  d = { x: n, y: o },
                  f = await l(t, s),
                  p = (0, r.Qq)((0, r.k3)(i)),
                  m = (0, r.Rn)(p),
                  v = d[m],
                  h = d[p];
                if (a) {
                  let e = v + f["y" === m ? "top" : "left"],
                    t = v - f["y" === m ? "bottom" : "right"];
                  v = (0, r.uZ)(e, v, t);
                }
                if (u) {
                  let e = "y" === p ? "top" : "left",
                    t = "y" === p ? "bottom" : "right",
                    n = h + f[e],
                    o = h - f[t];
                  h = (0, r.uZ)(n, h, o);
                }
                let g = c.fn({ ...t, [m]: v, [p]: h });
                return { ...g, data: { x: g.x - n, y: g.y - o } };
              },
            }
          );
        },
        v = function (e) {
          return (
            void 0 === e && (e = {}),
            {
              options: e,
              fn(t) {
                let {
                    x: n,
                    y: o,
                    placement: i,
                    rects: l,
                    middlewareData: a,
                  } = t,
                  {
                    offset: u = 0,
                    mainAxis: c = !0,
                    crossAxis: s = !0,
                  } = (0, r.ku)(e, t),
                  d = { x: n, y: o },
                  f = (0, r.Qq)(i),
                  p = (0, r.Rn)(f),
                  m = d[p],
                  v = d[f],
                  h = (0, r.ku)(u, t),
                  g =
                    "number" == typeof h
                      ? { mainAxis: h, crossAxis: 0 }
                      : { mainAxis: 0, crossAxis: 0, ...h };
                if (c) {
                  let e = "y" === p ? "height" : "width",
                    t = l.reference[p] - l.floating[e] + g.mainAxis,
                    n = l.reference[p] + l.reference[e] - g.mainAxis;
                  m < t ? (m = t) : m > n && (m = n);
                }
                if (s) {
                  var y, w;
                  let e = "y" === p ? "width" : "height",
                    t = ["top", "left"].includes((0, r.k3)(i)),
                    n =
                      l.reference[f] -
                      l.floating[e] +
                      ((t && (null == (y = a.offset) ? void 0 : y[f])) || 0) +
                      (t ? 0 : g.crossAxis),
                    o =
                      l.reference[f] +
                      l.reference[e] +
                      (t ? 0 : (null == (w = a.offset) ? void 0 : w[f]) || 0) -
                      (t ? g.crossAxis : 0);
                  v < n ? (v = n) : v > o && (v = o);
                }
                return { [p]: m, [f]: v };
              },
            }
          );
        },
        h = function (e) {
          return (
            void 0 === e && (e = {}),
            {
              name: "size",
              options: e,
              async fn(t) {
                let n, o;
                let { placement: i, rects: a, platform: u, elements: c } = t,
                  { apply: s = () => {}, ...d } = (0, r.ku)(e, t),
                  f = await l(t, d),
                  p = (0, r.k3)(i),
                  m = (0, r.hp)(i),
                  v = "y" === (0, r.Qq)(i),
                  { width: h, height: g } = a.floating;
                "top" === p || "bottom" === p
                  ? ((n = p),
                    (o =
                      m ===
                      ((await (null == u.isRTL ? void 0 : u.isRTL(c.floating)))
                        ? "start"
                        : "end")
                        ? "left"
                        : "right"))
                  : ((o = p), (n = "end" === m ? "top" : "bottom"));
                let y = g - f[n],
                  w = h - f[o],
                  b = !t.middlewareData.shift,
                  x = y,
                  E = w;
                if (v) {
                  let e = h - f.left - f.right;
                  E = m || b ? (0, r.VV)(w, e) : e;
                } else {
                  let e = g - f.top - f.bottom;
                  x = m || b ? (0, r.VV)(y, e) : e;
                }
                if (b && !m) {
                  let e = (0, r.Fp)(f.left, 0),
                    t = (0, r.Fp)(f.right, 0),
                    n = (0, r.Fp)(f.top, 0),
                    o = (0, r.Fp)(f.bottom, 0);
                  v
                    ? (E =
                        h -
                        2 *
                          (0 !== e || 0 !== t
                            ? e + t
                            : (0, r.Fp)(f.left, f.right)))
                    : (x =
                        g -
                        2 *
                          (0 !== n || 0 !== o
                            ? n + o
                            : (0, r.Fp)(f.top, f.bottom)));
                }
                await s({ ...t, availableWidth: E, availableHeight: x });
                let C = await u.getDimensions(c.floating);
                return h !== C.width || g !== C.height
                  ? { reset: { rects: !0 } }
                  : {};
              },
            }
          );
        };
    },
    73961: function (e, t, n) {
      n.d(t, {
        Me: function () {
          return O;
        },
        oo: function () {
          return W;
        },
      });
      var r = n(9082),
        o = n(49473);
      function i(e) {
        return u(e) ? (e.nodeName || "").toLowerCase() : "#document";
      }
      function l(e) {
        var t;
        return (
          (null == e
            ? void 0
            : null == (t = e.ownerDocument)
              ? void 0
              : t.defaultView) || window
        );
      }
      function a(e) {
        var t;
        return null ==
          (t = (u(e) ? e.ownerDocument : e.document) || window.document)
          ? void 0
          : t.documentElement;
      }
      function u(e) {
        return e instanceof Node || e instanceof l(e).Node;
      }
      function c(e) {
        return e instanceof Element || e instanceof l(e).Element;
      }
      function s(e) {
        return e instanceof HTMLElement || e instanceof l(e).HTMLElement;
      }
      function d(e) {
        return (
          "undefined" != typeof ShadowRoot &&
          (e instanceof ShadowRoot || e instanceof l(e).ShadowRoot)
        );
      }
      function f(e) {
        let { overflow: t, overflowX: n, overflowY: r, display: o } = h(e);
        return (
          /auto|scroll|overlay|hidden|clip/.test(t + r + n) &&
          !["inline", "contents"].includes(o)
        );
      }
      function p(e) {
        let t = m(),
          n = h(e);
        return (
          "none" !== n.transform ||
          "none" !== n.perspective ||
          (!!n.containerType && "normal" !== n.containerType) ||
          (!t && !!n.backdropFilter && "none" !== n.backdropFilter) ||
          (!t && !!n.filter && "none" !== n.filter) ||
          ["transform", "perspective", "filter"].some((e) =>
            (n.willChange || "").includes(e),
          ) ||
          ["paint", "layout", "strict", "content"].some((e) =>
            (n.contain || "").includes(e),
          )
        );
      }
      function m() {
        return (
          "undefined" != typeof CSS &&
          !!CSS.supports &&
          CSS.supports("-webkit-backdrop-filter", "none")
        );
      }
      function v(e) {
        return ["html", "body", "#document"].includes(i(e));
      }
      function h(e) {
        return l(e).getComputedStyle(e);
      }
      function g(e) {
        return c(e)
          ? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop }
          : { scrollLeft: e.pageXOffset, scrollTop: e.pageYOffset };
      }
      function y(e) {
        if ("html" === i(e)) return e;
        let t = e.assignedSlot || e.parentNode || (d(e) && e.host) || a(e);
        return d(t) ? t.host : t;
      }
      function w(e, t, n) {
        var r;
        void 0 === t && (t = []), void 0 === n && (n = !0);
        let o = (function e(t) {
            let n = y(t);
            return v(n)
              ? t.ownerDocument
                ? t.ownerDocument.body
                : t.body
              : s(n) && f(n)
                ? n
                : e(n);
          })(e),
          i = o === (null == (r = e.ownerDocument) ? void 0 : r.body),
          a = l(o);
        return i
          ? t.concat(
              a,
              a.visualViewport || [],
              f(o) ? o : [],
              a.frameElement && n ? w(a.frameElement) : [],
            )
          : t.concat(o, w(o, [], n));
      }
      function b(e) {
        let t = h(e),
          n = parseFloat(t.width) || 0,
          o = parseFloat(t.height) || 0,
          i = s(e),
          l = i ? e.offsetWidth : n,
          a = i ? e.offsetHeight : o,
          u = (0, r.NM)(n) !== l || (0, r.NM)(o) !== a;
        return u && ((n = l), (o = a)), { width: n, height: o, $: u };
      }
      function x(e) {
        return c(e) ? e : e.contextElement;
      }
      function E(e) {
        let t = x(e);
        if (!s(t)) return (0, r.ze)(1);
        let n = t.getBoundingClientRect(),
          { width: o, height: i, $: l } = b(t),
          a = (l ? (0, r.NM)(n.width) : n.width) / o,
          u = (l ? (0, r.NM)(n.height) : n.height) / i;
        return (
          (a && Number.isFinite(a)) || (a = 1),
          (u && Number.isFinite(u)) || (u = 1),
          { x: a, y: u }
        );
      }
      let C = (0, r.ze)(0);
      function S(e) {
        let t = l(e);
        return m() && t.visualViewport
          ? { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop }
          : C;
      }
      function R(e, t, n, o) {
        var i;
        void 0 === t && (t = !1), void 0 === n && (n = !1);
        let a = e.getBoundingClientRect(),
          u = x(e),
          s = (0, r.ze)(1);
        t && (o ? c(o) && (s = E(o)) : (s = E(e)));
        let d = (void 0 === (i = n) && (i = !1), o && (!i || o === l(u)) && i)
            ? S(u)
            : (0, r.ze)(0),
          f = (a.left + d.x) / s.x,
          p = (a.top + d.y) / s.y,
          m = a.width / s.x,
          v = a.height / s.y;
        if (u) {
          let e = l(u),
            t = o && c(o) ? l(o) : o,
            n = e.frameElement;
          for (; n && o && t !== e; ) {
            let e = E(n),
              t = n.getBoundingClientRect(),
              r = h(n),
              o = t.left + (n.clientLeft + parseFloat(r.paddingLeft)) * e.x,
              i = t.top + (n.clientTop + parseFloat(r.paddingTop)) * e.y;
            (f *= e.x),
              (p *= e.y),
              (m *= e.x),
              (v *= e.y),
              (f += o),
              (p += i),
              (n = l(n).frameElement);
          }
        }
        return (0, r.JB)({ width: m, height: v, x: f, y: p });
      }
      function k(e) {
        return R(a(e)).left + g(e).scrollLeft;
      }
      function T(e, t, n) {
        let o;
        if ("viewport" === t)
          o = (function (e, t) {
            let n = l(e),
              r = a(e),
              o = n.visualViewport,
              i = r.clientWidth,
              u = r.clientHeight,
              c = 0,
              s = 0;
            if (o) {
              (i = o.width), (u = o.height);
              let e = m();
              (!e || (e && "fixed" === t)) &&
                ((c = o.offsetLeft), (s = o.offsetTop));
            }
            return { width: i, height: u, x: c, y: s };
          })(e, n);
        else if ("document" === t)
          o = (function (e) {
            let t = a(e),
              n = g(e),
              o = e.ownerDocument.body,
              i = (0, r.Fp)(
                t.scrollWidth,
                t.clientWidth,
                o.scrollWidth,
                o.clientWidth,
              ),
              l = (0, r.Fp)(
                t.scrollHeight,
                t.clientHeight,
                o.scrollHeight,
                o.clientHeight,
              ),
              u = -n.scrollLeft + k(e),
              c = -n.scrollTop;
            return (
              "rtl" === h(o).direction &&
                (u += (0, r.Fp)(t.clientWidth, o.clientWidth) - i),
              { width: i, height: l, x: u, y: c }
            );
          })(a(e));
        else if (c(t))
          o = (function (e, t) {
            let n = R(e, !0, "fixed" === t),
              o = n.top + e.clientTop,
              i = n.left + e.clientLeft,
              l = s(e) ? E(e) : (0, r.ze)(1),
              a = e.clientWidth * l.x,
              u = e.clientHeight * l.y,
              c = i * l.x,
              d = o * l.y;
            return { width: a, height: u, x: c, y: d };
          })(t, n);
        else {
          let n = S(e);
          o = { ...t, x: t.x - n.x, y: t.y - n.y };
        }
        return (0, r.JB)(o);
      }
      function P(e, t) {
        return s(e) && "fixed" !== h(e).position
          ? t
            ? t(e)
            : e.offsetParent
          : null;
      }
      function L(e, t) {
        let n = l(e);
        if (!s(e)) return n;
        let r = P(e, t);
        for (
          ;
          r &&
          ["table", "td", "th"].includes(i(r)) &&
          "static" === h(r).position;

        )
          r = P(r, t);
        return r &&
          ("html" === i(r) ||
            ("body" === i(r) && "static" === h(r).position && !p(r)))
          ? n
          : r ||
              (function (e) {
                let t = y(e);
                for (; s(t) && !v(t); ) {
                  if (p(t)) return t;
                  t = y(t);
                }
                return null;
              })(e) ||
              n;
      }
      let M = async function (e) {
          let { reference: t, floating: n, strategy: o } = e,
            l = this.getOffsetParent || L,
            u = this.getDimensions;
          return {
            reference: (function (e, t, n) {
              let o = s(t),
                l = a(t),
                u = "fixed" === n,
                c = R(e, !0, u, t),
                d = { scrollLeft: 0, scrollTop: 0 },
                p = (0, r.ze)(0);
              if (o || (!o && !u)) {
                if ((("body" !== i(t) || f(l)) && (d = g(t)), o)) {
                  let e = R(t, !0, u, t);
                  (p.x = e.x + t.clientLeft), (p.y = e.y + t.clientTop);
                } else l && (p.x = k(l));
              }
              return {
                x: c.left + d.scrollLeft - p.x,
                y: c.top + d.scrollTop - p.y,
                width: c.width,
                height: c.height,
              };
            })(t, await l(n), o),
            floating: { x: 0, y: 0, ...(await u(n)) },
          };
        },
        A = {
          convertOffsetParentRelativeRectToViewportRelativeRect: function (e) {
            let { rect: t, offsetParent: n, strategy: o } = e,
              l = s(n),
              u = a(n);
            if (n === u) return t;
            let c = { scrollLeft: 0, scrollTop: 0 },
              d = (0, r.ze)(1),
              p = (0, r.ze)(0);
            if (
              (l || (!l && "fixed" !== o)) &&
              (("body" !== i(n) || f(u)) && (c = g(n)), s(n))
            ) {
              let e = R(n);
              (d = E(n)), (p.x = e.x + n.clientLeft), (p.y = e.y + n.clientTop);
            }
            return {
              width: t.width * d.x,
              height: t.height * d.y,
              x: t.x * d.x - c.scrollLeft * d.x + p.x,
              y: t.y * d.y - c.scrollTop * d.y + p.y,
            };
          },
          getDocumentElement: a,
          getClippingRect: function (e) {
            let { element: t, boundary: n, rootBoundary: o, strategy: l } = e,
              a =
                "clippingAncestors" === n
                  ? (function (e, t) {
                      let n = t.get(e);
                      if (n) return n;
                      let r = w(e, [], !1).filter(
                          (e) => c(e) && "body" !== i(e),
                        ),
                        o = null,
                        l = "fixed" === h(e).position,
                        a = l ? y(e) : e;
                      for (; c(a) && !v(a); ) {
                        let t = h(a),
                          n = p(a);
                        n || "fixed" !== t.position || (o = null);
                        let i = l
                          ? !n && !o
                          : (!n &&
                              "static" === t.position &&
                              !!o &&
                              ["absolute", "fixed"].includes(o.position)) ||
                            (f(a) &&
                              !n &&
                              (function e(t, n) {
                                let r = y(t);
                                return (
                                  !(r === n || !c(r) || v(r)) &&
                                  ("fixed" === h(r).position || e(r, n))
                                );
                              })(e, a));
                        i ? (r = r.filter((e) => e !== a)) : (o = t),
                          (a = y(a));
                      }
                      return t.set(e, r), r;
                    })(t, this._c)
                  : [].concat(n),
              u = [...a, o],
              s = u[0],
              d = u.reduce(
                (e, n) => {
                  let o = T(t, n, l);
                  return (
                    (e.top = (0, r.Fp)(o.top, e.top)),
                    (e.right = (0, r.VV)(o.right, e.right)),
                    (e.bottom = (0, r.VV)(o.bottom, e.bottom)),
                    (e.left = (0, r.Fp)(o.left, e.left)),
                    e
                  );
                },
                T(t, s, l),
              );
            return {
              width: d.right - d.left,
              height: d.bottom - d.top,
              x: d.left,
              y: d.top,
            };
          },
          getOffsetParent: L,
          getElementRects: M,
          getClientRects: function (e) {
            return Array.from(e.getClientRects());
          },
          getDimensions: function (e) {
            return b(e);
          },
          getScale: E,
          isElement: c,
          isRTL: function (e) {
            return "rtl" === h(e).direction;
          },
        };
      function O(e, t, n, o) {
        let i;
        void 0 === o && (o = {});
        let {
            ancestorScroll: l = !0,
            ancestorResize: u = !0,
            elementResize: c = "function" == typeof ResizeObserver,
            layoutShift: s = "function" == typeof IntersectionObserver,
            animationFrame: d = !1,
          } = o,
          f = x(e),
          p = l || u ? [...(f ? w(f) : []), ...w(t)] : [];
        p.forEach((e) => {
          l && e.addEventListener("scroll", n, { passive: !0 }),
            u && e.addEventListener("resize", n);
        });
        let m =
            f && s
              ? (function (e, t) {
                  let n,
                    o = null,
                    i = a(e);
                  function l() {
                    clearTimeout(n), o && o.disconnect(), (o = null);
                  }
                  return (
                    !(function a(u, c) {
                      void 0 === u && (u = !1), void 0 === c && (c = 1), l();
                      let {
                        left: s,
                        top: d,
                        width: f,
                        height: p,
                      } = e.getBoundingClientRect();
                      if ((u || t(), !f || !p)) return;
                      let m = (0, r.GW)(d),
                        v = (0, r.GW)(i.clientWidth - (s + f)),
                        h = (0, r.GW)(i.clientHeight - (d + p)),
                        g = (0, r.GW)(s),
                        y = {
                          rootMargin:
                            -m + "px " + -v + "px " + -h + "px " + -g + "px",
                          threshold: (0, r.Fp)(0, (0, r.VV)(1, c)) || 1,
                        },
                        w = !0;
                      function b(e) {
                        let t = e[0].intersectionRatio;
                        if (t !== c) {
                          if (!w) return a();
                          t
                            ? a(!1, t)
                            : (n = setTimeout(() => {
                                a(!1, 1e-7);
                              }, 100));
                        }
                        w = !1;
                      }
                      try {
                        o = new IntersectionObserver(b, {
                          ...y,
                          root: i.ownerDocument,
                        });
                      } catch (e) {
                        o = new IntersectionObserver(b, y);
                      }
                      o.observe(e);
                    })(!0),
                    l
                  );
                })(f, n)
              : null,
          v = -1,
          h = null;
        c &&
          ((h = new ResizeObserver((e) => {
            let [r] = e;
            r &&
              r.target === f &&
              h &&
              (h.unobserve(t),
              cancelAnimationFrame(v),
              (v = requestAnimationFrame(() => {
                h && h.observe(t);
              }))),
              n();
          })),
          f && !d && h.observe(f),
          h.observe(t));
        let g = d ? R(e) : null;
        return (
          d &&
            (function t() {
              let r = R(e);
              g &&
                (r.x !== g.x ||
                  r.y !== g.y ||
                  r.width !== g.width ||
                  r.height !== g.height) &&
                n(),
                (g = r),
                (i = requestAnimationFrame(t));
            })(),
          n(),
          () => {
            p.forEach((e) => {
              l && e.removeEventListener("scroll", n),
                u && e.removeEventListener("resize", n);
            }),
              m && m(),
              h && h.disconnect(),
              (h = null),
              d && cancelAnimationFrame(i);
          }
        );
      }
      let W = (e, t, n) => {
        let r = new Map(),
          i = { platform: A, ...n },
          l = { ...i.platform, _c: r };
        return (0, o.oo)(e, t, { ...i, platform: l });
      };
    },
    33136: function (e, t, n) {
      n.d(t, {
        YF: function () {
          return p;
        },
        x7: function () {
          return a;
        },
      });
      var r = n(49473),
        o = n(73961),
        i = n(2265),
        l = n(54887);
      let a = (e) => ({
        name: "arrow",
        options: e,
        fn(t) {
          let { element: n, padding: o } = "function" == typeof e ? e(t) : e;
          if (n && {}.hasOwnProperty.call(n, "current")) {
            if (null != n.current)
              return (0, r.x7)({ element: n.current, padding: o }).fn(t);
          } else if (n) return (0, r.x7)({ element: n, padding: o }).fn(t);
          return {};
        },
      });
      var u = "undefined" != typeof document ? i.useLayoutEffect : i.useEffect;
      function c(e, t) {
        let n, r, o;
        if (e === t) return !0;
        if (typeof e != typeof t) return !1;
        if ("function" == typeof e && e.toString() === t.toString()) return !0;
        if (e && t && "object" == typeof e) {
          if (Array.isArray(e)) {
            if ((n = e.length) != t.length) return !1;
            for (r = n; 0 != r--; ) if (!c(e[r], t[r])) return !1;
            return !0;
          }
          if ((n = (o = Object.keys(e)).length) !== Object.keys(t).length)
            return !1;
          for (r = n; 0 != r--; )
            if (!{}.hasOwnProperty.call(t, o[r])) return !1;
          for (r = n; 0 != r--; ) {
            let n = o[r];
            if (("_owner" !== n || !e.$$typeof) && !c(e[n], t[n])) return !1;
          }
          return !0;
        }
        return e != e && t != t;
      }
      function s(e) {
        if ("undefined" == typeof window) return 1;
        let t = e.ownerDocument.defaultView || window;
        return t.devicePixelRatio || 1;
      }
      function d(e, t) {
        let n = s(e);
        return Math.round(t * n) / n;
      }
      function f(e) {
        let t = i.useRef(e);
        return (
          u(() => {
            t.current = e;
          }),
          t
        );
      }
      function p(e) {
        void 0 === e && (e = {});
        let {
            placement: t = "bottom",
            strategy: n = "absolute",
            middleware: r = [],
            platform: a,
            elements: { reference: p, floating: m } = {},
            transform: v = !0,
            whileElementsMounted: h,
            open: g,
          } = e,
          [y, w] = i.useState({
            x: 0,
            y: 0,
            strategy: n,
            placement: t,
            middlewareData: {},
            isPositioned: !1,
          }),
          [b, x] = i.useState(r);
        c(b, r) || x(r);
        let [E, C] = i.useState(null),
          [S, R] = i.useState(null),
          k = i.useCallback(
            (e) => {
              e != M.current && ((M.current = e), C(e));
            },
            [C],
          ),
          T = i.useCallback(
            (e) => {
              e !== A.current && ((A.current = e), R(e));
            },
            [R],
          ),
          P = p || E,
          L = m || S,
          M = i.useRef(null),
          A = i.useRef(null),
          O = i.useRef(y),
          W = f(h),
          D = f(a),
          I = i.useCallback(() => {
            if (!M.current || !A.current) return;
            let e = { placement: t, strategy: n, middleware: b };
            D.current && (e.platform = D.current),
              (0, o.oo)(M.current, A.current, e).then((e) => {
                let t = { ...e, isPositioned: !0 };
                V.current &&
                  !c(O.current, t) &&
                  ((O.current = t),
                  l.flushSync(() => {
                    w(t);
                  }));
              });
          }, [b, t, n, D]);
        u(() => {
          !1 === g &&
            O.current.isPositioned &&
            ((O.current.isPositioned = !1),
            w((e) => ({ ...e, isPositioned: !1 })));
        }, [g]);
        let V = i.useRef(!1);
        u(
          () => (
            (V.current = !0),
            () => {
              V.current = !1;
            }
          ),
          [],
        ),
          u(() => {
            if ((P && (M.current = P), L && (A.current = L), P && L)) {
              if (W.current) return W.current(P, L, I);
              I();
            }
          }, [P, L, I, W]);
        let _ = i.useMemo(
            () => ({
              reference: M,
              floating: A,
              setReference: k,
              setFloating: T,
            }),
            [k, T],
          ),
          F = i.useMemo(() => ({ reference: P, floating: L }), [P, L]),
          N = i.useMemo(() => {
            let e = { position: n, left: 0, top: 0 };
            if (!F.floating) return e;
            let t = d(F.floating, y.x),
              r = d(F.floating, y.y);
            return v
              ? {
                  ...e,
                  transform: "translate(" + t + "px, " + r + "px)",
                  ...(s(F.floating) >= 1.5 && { willChange: "transform" }),
                }
              : { position: n, left: t, top: r };
          }, [n, v, F.floating, y.x, y.y]);
        return i.useMemo(
          () => ({ ...y, update: I, refs: _, elements: F, floatingStyles: N }),
          [y, I, _, F, N],
        );
      }
    },
    9082: function (e, t, n) {
      n.d(t, {
        Fp: function () {
          return i;
        },
        GW: function () {
          return a;
        },
        I4: function () {
          return h;
        },
        JB: function () {
          return R;
        },
        KX: function () {
          return E;
        },
        NM: function () {
          return l;
        },
        Qq: function () {
          return g;
        },
        Rn: function () {
          return v;
        },
        VV: function () {
          return o;
        },
        Wh: function () {
          return y;
        },
        gy: function () {
          return b;
        },
        hp: function () {
          return m;
        },
        i8: function () {
          return w;
        },
        k3: function () {
          return p;
        },
        ku: function () {
          return f;
        },
        mA: function () {
          return r;
        },
        pw: function () {
          return C;
        },
        uZ: function () {
          return d;
        },
        yd: function () {
          return S;
        },
        ze: function () {
          return u;
        },
      });
      let r = ["top", "right", "bottom", "left"],
        o = Math.min,
        i = Math.max,
        l = Math.round,
        a = Math.floor,
        u = (e) => ({ x: e, y: e }),
        c = { left: "right", right: "left", bottom: "top", top: "bottom" },
        s = { start: "end", end: "start" };
      function d(e, t, n) {
        return i(e, o(t, n));
      }
      function f(e, t) {
        return "function" == typeof e ? e(t) : e;
      }
      function p(e) {
        return e.split("-")[0];
      }
      function m(e) {
        return e.split("-")[1];
      }
      function v(e) {
        return "x" === e ? "y" : "x";
      }
      function h(e) {
        return "y" === e ? "height" : "width";
      }
      function g(e) {
        return ["top", "bottom"].includes(p(e)) ? "y" : "x";
      }
      function y(e) {
        return v(g(e));
      }
      function w(e, t, n) {
        void 0 === n && (n = !1);
        let r = m(e),
          o = y(e),
          i = h(o),
          l =
            "x" === o
              ? r === (n ? "end" : "start")
                ? "right"
                : "left"
              : "start" === r
                ? "bottom"
                : "top";
        return t.reference[i] > t.floating[i] && (l = C(l)), [l, C(l)];
      }
      function b(e) {
        let t = C(e);
        return [x(e), t, x(t)];
      }
      function x(e) {
        return e.replace(/start|end/g, (e) => s[e]);
      }
      function E(e, t, n, r) {
        let o = m(e),
          i = (function (e, t, n) {
            let r = ["left", "right"],
              o = ["right", "left"];
            switch (e) {
              case "top":
              case "bottom":
                if (n) return t ? o : r;
                return t ? r : o;
              case "left":
              case "right":
                return t ? ["top", "bottom"] : ["bottom", "top"];
              default:
                return [];
            }
          })(p(e), "start" === n, r);
        return (
          o && ((i = i.map((e) => e + "-" + o)), t && (i = i.concat(i.map(x)))),
          i
        );
      }
      function C(e) {
        return e.replace(/left|right|bottom|top/g, (e) => c[e]);
      }
      function S(e) {
        return "number" != typeof e
          ? { top: 0, right: 0, bottom: 0, left: 0, ...e }
          : { top: e, right: e, bottom: e, left: e };
      }
      function R(e) {
        return {
          ...e,
          top: e.y,
          left: e.x,
          right: e.x + e.width,
          bottom: e.y + e.height,
        };
      }
    },
    99279: function (e, t, n) {
      n.d(t, {
        f: function () {
          return a;
        },
      });
      var r = n(13428),
        o = n(2265),
        i = n(9381);
      let l = (0, o.forwardRef)((e, t) => {
          let { children: n, width: l = 10, height: a = 5, ...u } = e;
          return (0, o.createElement)(
            i.WV.svg,
            (0, r.Z)({}, u, {
              ref: t,
              width: l,
              height: a,
              viewBox: "0 0 30 10",
              preserveAspectRatio: "none",
            }),
            e.asChild
              ? n
              : (0, o.createElement)("polygon", { points: "0,0 30,0 15,10" }),
          );
        }),
        a = l;
    },
    65400: function (e, t, n) {
      n.d(t, {
        gm: function () {
          return i;
        },
      });
      var r = n(2265);
      let o = (0, r.createContext)(void 0);
      function i(e) {
        let t = (0, r.useContext)(o);
        return e || t || "ltr";
      }
    },
    31244: function (e, t, n) {
      n.d(t, {
        EW: function () {
          return i;
        },
      });
      var r = n(2265);
      let o = 0;
      function i() {
        (0, r.useEffect)(() => {
          var e, t;
          let n = document.querySelectorAll("[data-radix-focus-guard]");
          return (
            document.body.insertAdjacentElement(
              "afterbegin",
              null !== (e = n[0]) && void 0 !== e ? e : l(),
            ),
            document.body.insertAdjacentElement(
              "beforeend",
              null !== (t = n[1]) && void 0 !== t ? t : l(),
            ),
            o++,
            () => {
              1 === o &&
                document
                  .querySelectorAll("[data-radix-focus-guard]")
                  .forEach((e) => e.remove()),
                o--;
            }
          );
        }, []);
      }
      function l() {
        let e = document.createElement("span");
        return (
          e.setAttribute("data-radix-focus-guard", ""),
          (e.tabIndex = 0),
          (e.style.cssText =
            "outline: none; opacity: 0; position: fixed; pointer-events: none"),
          e
        );
      }
    },
    20966: function (e, t, n) {
      n.d(t, {
        M: function () {
          return u;
        },
      });
      var r,
        o = n(2265),
        i = n(51030);
      let l = (r || (r = n.t(o, 2)))["useId".toString()] || (() => void 0),
        a = 0;
      function u(e) {
        let [t, n] = o.useState(l());
        return (
          (0, i.b)(() => {
            e || n((e) => (null != e ? e : String(a++)));
          }, [e]),
          e || (t ? `radix-${t}` : "")
        );
      }
    },
    93342: function (e, t, n) {
      let r, o;
      n.d(t, {
        VY: function () {
          return e0;
        },
        ZA: function () {
          return e2;
        },
        JO: function () {
          return eJ;
        },
        ck: function () {
          return e4;
        },
        wU: function () {
          return e7;
        },
        eT: function () {
          return e5;
        },
        __: function () {
          return e3;
        },
        h_: function () {
          return eQ;
        },
        fC: function () {
          return eX;
        },
        Z0: function () {
          return e9;
        },
        xz: function () {
          return eU;
        },
        B4: function () {
          return eG;
        },
        l_: function () {
          return e1;
        },
      });
      var i = n(13428),
        l = n(2265),
        a = n(54887);
      function u(e, [t, n]) {
        return Math.min(n, Math.max(t, e));
      }
      var c = n(85744),
        s = n(27733),
        d = n(42210),
        f = n(56989),
        p = n(65400),
        m = n(9381),
        v = n(16459),
        h = n(12488);
      let g = "dismissableLayer.update",
        y = (0, l.createContext)({
          layers: new Set(),
          layersWithOutsidePointerEventsDisabled: new Set(),
          branches: new Set(),
        }),
        w = (0, l.forwardRef)((e, t) => {
          var n;
          let {
              disableOutsidePointerEvents: o = !1,
              onEscapeKeyDown: a,
              onPointerDownOutside: u,
              onFocusOutside: s,
              onInteractOutside: f,
              onDismiss: p,
              ...w
            } = e,
            E = (0, l.useContext)(y),
            [C, S] = (0, l.useState)(null),
            R =
              null !== (n = null == C ? void 0 : C.ownerDocument) &&
              void 0 !== n
                ? n
                : null == globalThis
                  ? void 0
                  : globalThis.document,
            [, k] = (0, l.useState)({}),
            T = (0, d.e)(t, (e) => S(e)),
            P = Array.from(E.layers),
            [L] = [...E.layersWithOutsidePointerEventsDisabled].slice(-1),
            M = P.indexOf(L),
            A = C ? P.indexOf(C) : -1,
            O = E.layersWithOutsidePointerEventsDisabled.size > 0,
            W = A >= M,
            D = (function (
              e,
              t = null == globalThis ? void 0 : globalThis.document,
            ) {
              let n = (0, v.W)(e),
                r = (0, l.useRef)(!1),
                o = (0, l.useRef)(() => {});
              return (
                (0, l.useEffect)(() => {
                  let e = (e) => {
                      if (e.target && !r.current) {
                        let r = { originalEvent: e };
                        function i() {
                          x("dismissableLayer.pointerDownOutside", n, r, {
                            discrete: !0,
                          });
                        }
                        "touch" === e.pointerType
                          ? (t.removeEventListener("click", o.current),
                            (o.current = i),
                            t.addEventListener("click", o.current, {
                              once: !0,
                            }))
                          : i();
                      }
                      r.current = !1;
                    },
                    i = window.setTimeout(() => {
                      t.addEventListener("pointerdown", e);
                    }, 0);
                  return () => {
                    window.clearTimeout(i),
                      t.removeEventListener("pointerdown", e),
                      t.removeEventListener("click", o.current);
                  };
                }, [t, n]),
                { onPointerDownCapture: () => (r.current = !0) }
              );
            })((e) => {
              let t = e.target,
                n = [...E.branches].some((e) => e.contains(t));
              !W ||
                n ||
                (null == u || u(e),
                null == f || f(e),
                e.defaultPrevented || null == p || p());
            }, R),
            I = (function (
              e,
              t = null == globalThis ? void 0 : globalThis.document,
            ) {
              let n = (0, v.W)(e),
                r = (0, l.useRef)(!1);
              return (
                (0, l.useEffect)(() => {
                  let e = (e) => {
                    e.target &&
                      !r.current &&
                      x(
                        "dismissableLayer.focusOutside",
                        n,
                        { originalEvent: e },
                        { discrete: !1 },
                      );
                  };
                  return (
                    t.addEventListener("focusin", e),
                    () => t.removeEventListener("focusin", e)
                  );
                }, [t, n]),
                {
                  onFocusCapture: () => (r.current = !0),
                  onBlurCapture: () => (r.current = !1),
                }
              );
            })((e) => {
              let t = e.target,
                n = [...E.branches].some((e) => e.contains(t));
              n ||
                (null == s || s(e),
                null == f || f(e),
                e.defaultPrevented || null == p || p());
            }, R);
          return (
            (0, h.e)((e) => {
              let t = A === E.layers.size - 1;
              t &&
                (null == a || a(e),
                !e.defaultPrevented && p && (e.preventDefault(), p()));
            }, R),
            (0, l.useEffect)(() => {
              if (C)
                return (
                  o &&
                    (0 === E.layersWithOutsidePointerEventsDisabled.size &&
                      ((r = R.body.style.pointerEvents),
                      (R.body.style.pointerEvents = "none")),
                    E.layersWithOutsidePointerEventsDisabled.add(C)),
                  E.layers.add(C),
                  b(),
                  () => {
                    o &&
                      1 === E.layersWithOutsidePointerEventsDisabled.size &&
                      (R.body.style.pointerEvents = r);
                  }
                );
            }, [C, R, o, E]),
            (0, l.useEffect)(
              () => () => {
                C &&
                  (E.layers.delete(C),
                  E.layersWithOutsidePointerEventsDisabled.delete(C),
                  b());
              },
              [C, E],
            ),
            (0, l.useEffect)(() => {
              let e = () => k({});
              return (
                document.addEventListener(g, e),
                () => document.removeEventListener(g, e)
              );
            }, []),
            (0, l.createElement)(
              m.WV.div,
              (0, i.Z)({}, w, {
                ref: T,
                style: {
                  pointerEvents: O ? (W ? "auto" : "none") : void 0,
                  ...e.style,
                },
                onFocusCapture: (0, c.M)(e.onFocusCapture, I.onFocusCapture),
                onBlurCapture: (0, c.M)(e.onBlurCapture, I.onBlurCapture),
                onPointerDownCapture: (0, c.M)(
                  e.onPointerDownCapture,
                  D.onPointerDownCapture,
                ),
              }),
            )
          );
        });
      function b() {
        let e = new CustomEvent(g);
        document.dispatchEvent(e);
      }
      function x(e, t, n, { discrete: r }) {
        let o = n.originalEvent.target,
          i = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
        t && o.addEventListener(e, t, { once: !0 }),
          r ? (0, m.jH)(o, i) : o.dispatchEvent(i);
      }
      var E = n(31244);
      let C = "focusScope.autoFocusOnMount",
        S = "focusScope.autoFocusOnUnmount",
        R = { bubbles: !1, cancelable: !0 },
        k = (0, l.forwardRef)((e, t) => {
          let {
              loop: n = !1,
              trapped: r = !1,
              onMountAutoFocus: o,
              onUnmountAutoFocus: a,
              ...u
            } = e,
            [c, s] = (0, l.useState)(null),
            f = (0, v.W)(o),
            p = (0, v.W)(a),
            h = (0, l.useRef)(null),
            g = (0, d.e)(t, (e) => s(e)),
            y = (0, l.useRef)({
              paused: !1,
              pause() {
                this.paused = !0;
              },
              resume() {
                this.paused = !1;
              },
            }).current;
          (0, l.useEffect)(() => {
            if (r) {
              function e(e) {
                if (y.paused || !c) return;
                let t = e.target;
                c.contains(t) ? (h.current = t) : L(h.current, { select: !0 });
              }
              function t(e) {
                if (y.paused || !c) return;
                let t = e.relatedTarget;
                null === t || c.contains(t) || L(h.current, { select: !0 });
              }
              document.addEventListener("focusin", e),
                document.addEventListener("focusout", t);
              let n = new MutationObserver(function (e) {
                let t = document.activeElement;
                for (let n of e)
                  n.removedNodes.length > 0 &&
                    !(null != c && c.contains(t)) &&
                    L(c);
              });
              return (
                c && n.observe(c, { childList: !0, subtree: !0 }),
                () => {
                  document.removeEventListener("focusin", e),
                    document.removeEventListener("focusout", t),
                    n.disconnect();
                }
              );
            }
          }, [r, c, y.paused]),
            (0, l.useEffect)(() => {
              if (c) {
                M.add(y);
                let e = document.activeElement,
                  t = c.contains(e);
                if (!t) {
                  let t = new CustomEvent(C, R);
                  c.addEventListener(C, f),
                    c.dispatchEvent(t),
                    t.defaultPrevented ||
                      ((function (e, { select: t = !1 } = {}) {
                        let n = document.activeElement;
                        for (let r of e)
                          if (
                            (L(r, { select: t }), document.activeElement !== n)
                          )
                            return;
                      })(
                        T(c).filter((e) => "A" !== e.tagName),
                        { select: !0 },
                      ),
                      document.activeElement === e && L(c));
                }
                return () => {
                  c.removeEventListener(C, f),
                    setTimeout(() => {
                      let t = new CustomEvent(S, R);
                      c.addEventListener(S, p),
                        c.dispatchEvent(t),
                        t.defaultPrevented ||
                          L(null != e ? e : document.body, { select: !0 }),
                        c.removeEventListener(S, p),
                        M.remove(y);
                    }, 0);
                };
              }
            }, [c, f, p, y]);
          let w = (0, l.useCallback)(
            (e) => {
              if ((!n && !r) || y.paused) return;
              let t = "Tab" === e.key && !e.altKey && !e.ctrlKey && !e.metaKey,
                o = document.activeElement;
              if (t && o) {
                let t = e.currentTarget,
                  [r, i] = (function (e) {
                    let t = T(e),
                      n = P(t, e),
                      r = P(t.reverse(), e);
                    return [n, r];
                  })(t),
                  l = r && i;
                l
                  ? e.shiftKey || o !== i
                    ? e.shiftKey &&
                      o === r &&
                      (e.preventDefault(), n && L(i, { select: !0 }))
                    : (e.preventDefault(), n && L(r, { select: !0 }))
                  : o === t && e.preventDefault();
              }
            },
            [n, r, y.paused],
          );
          return (0, l.createElement)(
            m.WV.div,
            (0, i.Z)({ tabIndex: -1 }, u, { ref: g, onKeyDown: w }),
          );
        });
      function T(e) {
        let t = [],
          n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (e) => {
              let t = "INPUT" === e.tagName && "hidden" === e.type;
              return e.disabled || e.hidden || t
                ? NodeFilter.FILTER_SKIP
                : e.tabIndex >= 0
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_SKIP;
            },
          });
        for (; n.nextNode(); ) t.push(n.currentNode);
        return t;
      }
      function P(e, t) {
        for (let n of e)
          if (
            !(function (e, { upTo: t }) {
              if ("hidden" === getComputedStyle(e).visibility) return !0;
              for (; e && (void 0 === t || e !== t); ) {
                if ("none" === getComputedStyle(e).display) return !0;
                e = e.parentElement;
              }
              return !1;
            })(n, { upTo: t })
          )
            return n;
      }
      function L(e, { select: t = !1 } = {}) {
        if (e && e.focus) {
          var n;
          let r = document.activeElement;
          e.focus({ preventScroll: !0 }),
            e !== r &&
              (n = e) instanceof HTMLInputElement &&
              "select" in n &&
              t &&
              e.select();
        }
      }
      let M =
        ((o = []),
        {
          add(e) {
            let t = o[0];
            e !== t && (null == t || t.pause()), (o = A(o, e)).unshift(e);
          },
          remove(e) {
            var t;
            null === (t = (o = A(o, e))[0]) || void 0 === t || t.resume();
          },
        });
      function A(e, t) {
        let n = [...e],
          r = n.indexOf(t);
        return -1 !== r && n.splice(r, 1), n;
      }
      var O = n(20966),
        W = n(33136),
        D = n(73961),
        I = n(49473),
        V = n(99279),
        _ = n(51030),
        F = n(94977);
      let N = "Popper",
        [H, B] = (0, f.b)(N),
        [Z, z] = H(N),
        K = (0, l.forwardRef)((e, t) => {
          let { __scopePopper: n, virtualRef: r, ...o } = e,
            a = z("PopperAnchor", n),
            u = (0, l.useRef)(null),
            c = (0, d.e)(t, u);
          return (
            (0, l.useEffect)(() => {
              a.onAnchorChange((null == r ? void 0 : r.current) || u.current);
            }),
            r
              ? null
              : (0, l.createElement)(m.WV.div, (0, i.Z)({}, o, { ref: c }))
          );
        }),
        j = "PopperContent",
        [q, Y] = H(j),
        $ = (0, l.forwardRef)((e, t) => {
          var n, r, o, a, u, c, s, f;
          let {
              __scopePopper: p,
              side: h = "bottom",
              sideOffset: g = 0,
              align: y = "center",
              alignOffset: w = 0,
              arrowPadding: b = 0,
              collisionBoundary: x = [],
              collisionPadding: E = 0,
              sticky: C = "partial",
              hideWhenDetached: S = !1,
              avoidCollisions: R = !0,
              onPlaced: k,
              ...T
            } = e,
            P = z(j, p),
            [L, M] = (0, l.useState)(null),
            A = (0, d.e)(t, (e) => M(e)),
            [O, V] = (0, l.useState)(null),
            N = (0, F.t)(O),
            H =
              null !== (n = null == N ? void 0 : N.width) && void 0 !== n
                ? n
                : 0,
            B =
              null !== (r = null == N ? void 0 : N.height) && void 0 !== r
                ? r
                : 0,
            Z =
              "number" == typeof E
                ? E
                : { top: 0, right: 0, bottom: 0, left: 0, ...E },
            K = Array.isArray(x) ? x : [x],
            Y = K.length > 0,
            $ = { padding: Z, boundary: K.filter(U), altBoundary: Y },
            {
              refs: X,
              floatingStyles: Q,
              placement: ee,
              isPositioned: et,
              middlewareData: en,
            } = (0, W.YF)({
              strategy: "fixed",
              placement: h + ("center" !== y ? "-" + y : ""),
              whileElementsMounted: D.Me,
              elements: { reference: P.anchor },
              middleware: [
                (0, I.cv)({ mainAxis: g + B, alignmentAxis: w }),
                R &&
                  (0, I.uY)({
                    mainAxis: !0,
                    crossAxis: !1,
                    limiter: "partial" === C ? (0, I.dr)() : void 0,
                    ...$,
                  }),
                R && (0, I.RR)({ ...$ }),
                (0, I.dp)({
                  ...$,
                  apply: ({
                    elements: e,
                    rects: t,
                    availableWidth: n,
                    availableHeight: r,
                  }) => {
                    let { width: o, height: i } = t.reference,
                      l = e.floating.style;
                    l.setProperty("--radix-popper-available-width", `${n}px`),
                      l.setProperty(
                        "--radix-popper-available-height",
                        `${r}px`,
                      ),
                      l.setProperty("--radix-popper-anchor-width", `${o}px`),
                      l.setProperty("--radix-popper-anchor-height", `${i}px`);
                  },
                }),
                O && (0, W.x7)({ element: O, padding: b }),
                G({ arrowWidth: H, arrowHeight: B }),
                S && (0, I.Cp)({ strategy: "referenceHidden" }),
              ],
            }),
            [er, eo] = J(ee),
            ei = (0, v.W)(k);
          (0, _.b)(() => {
            et && (null == ei || ei());
          }, [et, ei]);
          let el = null === (o = en.arrow) || void 0 === o ? void 0 : o.x,
            ea = null === (a = en.arrow) || void 0 === a ? void 0 : a.y,
            eu =
              (null === (u = en.arrow) || void 0 === u
                ? void 0
                : u.centerOffset) !== 0,
            [ec, es] = (0, l.useState)();
          return (
            (0, _.b)(() => {
              L && es(window.getComputedStyle(L).zIndex);
            }, [L]),
            (0, l.createElement)(
              "div",
              {
                ref: X.setFloating,
                "data-radix-popper-content-wrapper": "",
                style: {
                  ...Q,
                  transform: et ? Q.transform : "translate(0, -200%)",
                  minWidth: "max-content",
                  zIndex: ec,
                  "--radix-popper-transform-origin": [
                    null === (c = en.transformOrigin) || void 0 === c
                      ? void 0
                      : c.x,
                    null === (s = en.transformOrigin) || void 0 === s
                      ? void 0
                      : s.y,
                  ].join(" "),
                },
                dir: e.dir,
              },
              (0, l.createElement)(
                q,
                {
                  scope: p,
                  placedSide: er,
                  onArrowChange: V,
                  arrowX: el,
                  arrowY: ea,
                  shouldHideArrow: eu,
                },
                (0, l.createElement)(
                  m.WV.div,
                  (0, i.Z)({ "data-side": er, "data-align": eo }, T, {
                    ref: A,
                    style: {
                      ...T.style,
                      animation: et ? void 0 : "none",
                      opacity:
                        null !== (f = en.hide) &&
                        void 0 !== f &&
                        f.referenceHidden
                          ? 0
                          : void 0,
                    },
                  }),
                ),
              ),
            )
          );
        }),
        X = { top: "bottom", right: "left", bottom: "top", left: "right" };
      function U(e) {
        return null !== e;
      }
      let G = (e) => ({
        name: "transformOrigin",
        options: e,
        fn(t) {
          var n, r, o, i, l;
          let { placement: a, rects: u, middlewareData: c } = t,
            s =
              (null === (n = c.arrow) || void 0 === n
                ? void 0
                : n.centerOffset) !== 0,
            d = s ? 0 : e.arrowWidth,
            f = s ? 0 : e.arrowHeight,
            [p, m] = J(a),
            v = { start: "0%", center: "50%", end: "100%" }[m],
            h =
              (null !==
                (r = null === (o = c.arrow) || void 0 === o ? void 0 : o.x) &&
              void 0 !== r
                ? r
                : 0) +
              d / 2,
            g =
              (null !==
                (i = null === (l = c.arrow) || void 0 === l ? void 0 : l.y) &&
              void 0 !== i
                ? i
                : 0) +
              f / 2,
            y = "",
            w = "";
          return (
            "bottom" === p
              ? ((y = s ? v : `${h}px`), (w = `${-f}px`))
              : "top" === p
                ? ((y = s ? v : `${h}px`), (w = `${u.floating.height + f}px`))
                : "right" === p
                  ? ((y = `${-f}px`), (w = s ? v : `${g}px`))
                  : "left" === p &&
                    ((y = `${u.floating.width + f}px`), (w = s ? v : `${g}px`)),
            { data: { x: y, y: w } }
          );
        },
      });
      function J(e) {
        let [t, n = "center"] = e.split("-");
        return [t, n];
      }
      let Q = (e) => {
          let { __scopePopper: t, children: n } = e,
            [r, o] = (0, l.useState)(null);
          return (0, l.createElement)(
            Z,
            { scope: t, anchor: r, onAnchorChange: o },
            n,
          );
        },
        ee = (0, l.forwardRef)((e, t) => {
          var n;
          let {
            container: r = null == globalThis
              ? void 0
              : null === (n = globalThis.document) || void 0 === n
                ? void 0
                : n.body,
            ...o
          } = e;
          return r
            ? a.createPortal(
                (0, l.createElement)(m.WV.div, (0, i.Z)({}, o, { ref: t })),
                r,
              )
            : null;
        });
      var et = n(67256),
        en = n(73763),
        er = n(85184),
        eo = n(8281),
        ei = n(85859),
        el = n(73386);
      let ea = [" ", "Enter", "ArrowUp", "ArrowDown"],
        eu = [" ", "Enter"],
        ec = "Select",
        [es, ed, ef] = (0, s.B)(ec),
        [ep, em] = (0, f.b)(ec, [ef, B]),
        ev = B(),
        [eh, eg] = ep(ec),
        [ey, ew] = ep(ec),
        eb = (0, l.forwardRef)((e, t) => {
          let { __scopeSelect: n, disabled: r = !1, ...o } = e,
            a = ev(n),
            u = eg("SelectTrigger", n),
            s = u.disabled || r,
            f = (0, d.e)(t, u.onTriggerChange),
            p = ed(n),
            [v, h, g] = eY((e) => {
              let t = p().filter((e) => !e.disabled),
                n = t.find((e) => e.value === u.value),
                r = e$(t, e, n);
              void 0 !== r && u.onValueChange(r.value);
            }),
            y = () => {
              s || (u.onOpenChange(!0), g());
            };
          return (0, l.createElement)(
            K,
            (0, i.Z)({ asChild: !0 }, a),
            (0, l.createElement)(
              m.WV.button,
              (0, i.Z)(
                {
                  type: "button",
                  role: "combobox",
                  "aria-controls": u.contentId,
                  "aria-expanded": u.open,
                  "aria-required": u.required,
                  "aria-autocomplete": "none",
                  dir: u.dir,
                  "data-state": u.open ? "open" : "closed",
                  disabled: s,
                  "data-disabled": s ? "" : void 0,
                  "data-placeholder": void 0 === u.value ? "" : void 0,
                },
                o,
                {
                  ref: f,
                  onClick: (0, c.M)(o.onClick, (e) => {
                    e.currentTarget.focus();
                  }),
                  onPointerDown: (0, c.M)(o.onPointerDown, (e) => {
                    let t = e.target;
                    t.hasPointerCapture(e.pointerId) &&
                      t.releasePointerCapture(e.pointerId),
                      0 === e.button &&
                        !1 === e.ctrlKey &&
                        (y(),
                        (u.triggerPointerDownPosRef.current = {
                          x: Math.round(e.pageX),
                          y: Math.round(e.pageY),
                        }),
                        e.preventDefault());
                  }),
                  onKeyDown: (0, c.M)(o.onKeyDown, (e) => {
                    let t = "" !== v.current,
                      n = e.ctrlKey || e.altKey || e.metaKey;
                    n || 1 !== e.key.length || h(e.key),
                      (!t || " " !== e.key) &&
                        ea.includes(e.key) &&
                        (y(), e.preventDefault());
                  }),
                },
              ),
            ),
          );
        }),
        ex = (0, l.forwardRef)((e, t) => {
          let {
              __scopeSelect: n,
              className: r,
              style: o,
              children: a,
              placeholder: u,
              ...c
            } = e,
            s = eg("SelectValue", n),
            { onValueNodeHasChildrenChange: f } = s,
            p = void 0 !== a,
            v = (0, d.e)(t, s.onValueNodeChange);
          return (
            (0, _.b)(() => {
              f(p);
            }, [f, p]),
            (0, l.createElement)(
              m.WV.span,
              (0, i.Z)({}, c, { ref: v, style: { pointerEvents: "none" } }),
              void 0 === s.value && void 0 !== u ? u : a,
            )
          );
        }),
        eE = (0, l.forwardRef)((e, t) => {
          let { __scopeSelect: n, children: r, ...o } = e;
          return (0, l.createElement)(
            m.WV.span,
            (0, i.Z)({ "aria-hidden": !0 }, o, { ref: t }),
            r || "▼",
          );
        }),
        eC = "SelectContent",
        eS = (0, l.forwardRef)((e, t) => {
          let n = eg(eC, e.__scopeSelect),
            [r, o] = (0, l.useState)();
          return ((0, _.b)(() => {
            o(new DocumentFragment());
          }, []),
          n.open)
            ? (0, l.createElement)(eT, (0, i.Z)({}, e, { ref: t }))
            : r
              ? (0, a.createPortal)(
                  (0, l.createElement)(
                    eR,
                    { scope: e.__scopeSelect },
                    (0, l.createElement)(
                      es.Slot,
                      { scope: e.__scopeSelect },
                      (0, l.createElement)("div", null, e.children),
                    ),
                  ),
                  r,
                )
              : null;
        }),
        [eR, ek] = ep(eC),
        eT = (0, l.forwardRef)((e, t) => {
          let {
              __scopeSelect: n,
              position: r = "item-aligned",
              onCloseAutoFocus: o,
              onEscapeKeyDown: a,
              onPointerDownOutside: u,
              side: s,
              sideOffset: f,
              align: p,
              alignOffset: m,
              arrowPadding: v,
              collisionBoundary: h,
              collisionPadding: g,
              sticky: y,
              hideWhenDetached: b,
              avoidCollisions: x,
              ...C
            } = e,
            S = eg(eC, n),
            [R, T] = (0, l.useState)(null),
            [P, L] = (0, l.useState)(null),
            M = (0, d.e)(t, (e) => T(e)),
            [A, O] = (0, l.useState)(null),
            [W, D] = (0, l.useState)(null),
            I = ed(n),
            [V, _] = (0, l.useState)(!1),
            F = (0, l.useRef)(!1);
          (0, l.useEffect)(() => {
            if (R) return (0, ei.Ry)(R);
          }, [R]),
            (0, E.EW)();
          let N = (0, l.useCallback)(
              (e) => {
                let [t, ...n] = I().map((e) => e.ref.current),
                  [r] = n.slice(-1),
                  o = document.activeElement;
                for (let n of e)
                  if (
                    n === o ||
                    (null == n || n.scrollIntoView({ block: "nearest" }),
                    n === t && P && (P.scrollTop = 0),
                    n === r && P && (P.scrollTop = P.scrollHeight),
                    null == n || n.focus(),
                    document.activeElement !== o)
                  )
                    return;
              },
              [I, P],
            ),
            H = (0, l.useCallback)(() => N([A, R]), [N, A, R]);
          (0, l.useEffect)(() => {
            V && H();
          }, [V, H]);
          let { onOpenChange: B, triggerPointerDownPosRef: Z } = S;
          (0, l.useEffect)(() => {
            if (R) {
              let e = { x: 0, y: 0 },
                t = (t) => {
                  var n, r, o, i;
                  e = {
                    x: Math.abs(
                      Math.round(t.pageX) -
                        (null !==
                          (n =
                            null === (r = Z.current) || void 0 === r
                              ? void 0
                              : r.x) && void 0 !== n
                          ? n
                          : 0),
                    ),
                    y: Math.abs(
                      Math.round(t.pageY) -
                        (null !==
                          (o =
                            null === (i = Z.current) || void 0 === i
                              ? void 0
                              : i.y) && void 0 !== o
                          ? o
                          : 0),
                    ),
                  };
                },
                n = (n) => {
                  e.x <= 10 && e.y <= 10
                    ? n.preventDefault()
                    : R.contains(n.target) || B(!1),
                    document.removeEventListener("pointermove", t),
                    (Z.current = null);
                };
              return (
                null !== Z.current &&
                  (document.addEventListener("pointermove", t),
                  document.addEventListener("pointerup", n, {
                    capture: !0,
                    once: !0,
                  })),
                () => {
                  document.removeEventListener("pointermove", t),
                    document.removeEventListener("pointerup", n, {
                      capture: !0,
                    });
                }
              );
            }
          }, [R, B, Z]),
            (0, l.useEffect)(() => {
              let e = () => B(!1);
              return (
                window.addEventListener("blur", e),
                window.addEventListener("resize", e),
                () => {
                  window.removeEventListener("blur", e),
                    window.removeEventListener("resize", e);
                }
              );
            }, [B]);
          let [z, K] = eY((e) => {
              let t = I().filter((e) => !e.disabled),
                n = t.find((e) => e.ref.current === document.activeElement),
                r = e$(t, e, n);
              r && setTimeout(() => r.ref.current.focus());
            }),
            j = (0, l.useCallback)(
              (e, t, n) => {
                let r = !F.current && !n,
                  o = void 0 !== S.value && S.value === t;
                (o || r) && (O(e), r && (F.current = !0));
              },
              [S.value],
            ),
            q = (0, l.useCallback)(() => (null == R ? void 0 : R.focus()), [R]),
            Y = (0, l.useCallback)(
              (e, t, n) => {
                let r = !F.current && !n,
                  o = void 0 !== S.value && S.value === t;
                (o || r) && D(e);
              },
              [S.value],
            ),
            $ = "popper" === r ? eL : eP,
            X =
              $ === eL
                ? {
                    side: s,
                    sideOffset: f,
                    align: p,
                    alignOffset: m,
                    arrowPadding: v,
                    collisionBoundary: h,
                    collisionPadding: g,
                    sticky: y,
                    hideWhenDetached: b,
                    avoidCollisions: x,
                  }
                : {};
          return (0, l.createElement)(
            eR,
            {
              scope: n,
              content: R,
              viewport: P,
              onViewportChange: L,
              itemRefCallback: j,
              selectedItem: A,
              onItemLeave: q,
              itemTextRefCallback: Y,
              focusSelectedItem: H,
              selectedItemText: W,
              position: r,
              isPositioned: V,
              searchRef: z,
            },
            (0, l.createElement)(
              el.Z,
              { as: et.g7, allowPinchZoom: !0 },
              (0, l.createElement)(
                k,
                {
                  asChild: !0,
                  trapped: S.open,
                  onMountAutoFocus: (e) => {
                    e.preventDefault();
                  },
                  onUnmountAutoFocus: (0, c.M)(o, (e) => {
                    var t;
                    null === (t = S.trigger) ||
                      void 0 === t ||
                      t.focus({ preventScroll: !0 }),
                      e.preventDefault();
                  }),
                },
                (0, l.createElement)(
                  w,
                  {
                    asChild: !0,
                    disableOutsidePointerEvents: !0,
                    onEscapeKeyDown: a,
                    onPointerDownOutside: u,
                    onFocusOutside: (e) => e.preventDefault(),
                    onDismiss: () => S.onOpenChange(!1),
                  },
                  (0, l.createElement)(
                    $,
                    (0, i.Z)(
                      {
                        role: "listbox",
                        id: S.contentId,
                        "data-state": S.open ? "open" : "closed",
                        dir: S.dir,
                        onContextMenu: (e) => e.preventDefault(),
                      },
                      C,
                      X,
                      {
                        onPlaced: () => _(!0),
                        ref: M,
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          outline: "none",
                          ...C.style,
                        },
                        onKeyDown: (0, c.M)(C.onKeyDown, (e) => {
                          let t = e.ctrlKey || e.altKey || e.metaKey;
                          if (
                            ("Tab" === e.key && e.preventDefault(),
                            t || 1 !== e.key.length || K(e.key),
                            ["ArrowUp", "ArrowDown", "Home", "End"].includes(
                              e.key,
                            ))
                          ) {
                            let t = I().filter((e) => !e.disabled),
                              n = t.map((e) => e.ref.current);
                            if (
                              (["ArrowUp", "End"].includes(e.key) &&
                                (n = n.slice().reverse()),
                              ["ArrowUp", "ArrowDown"].includes(e.key))
                            ) {
                              let t = e.target,
                                r = n.indexOf(t);
                              n = n.slice(r + 1);
                            }
                            setTimeout(() => N(n)), e.preventDefault();
                          }
                        }),
                      },
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
        eP = (0, l.forwardRef)((e, t) => {
          let { __scopeSelect: n, onPlaced: r, ...o } = e,
            a = eg(eC, n),
            c = ek(eC, n),
            [s, f] = (0, l.useState)(null),
            [p, v] = (0, l.useState)(null),
            h = (0, d.e)(t, (e) => v(e)),
            g = ed(n),
            y = (0, l.useRef)(!1),
            w = (0, l.useRef)(!0),
            {
              viewport: b,
              selectedItem: x,
              selectedItemText: E,
              focusSelectedItem: C,
            } = c,
            S = (0, l.useCallback)(() => {
              if (a.trigger && a.valueNode && s && p && b && x && E) {
                let e = a.trigger.getBoundingClientRect(),
                  t = p.getBoundingClientRect(),
                  n = a.valueNode.getBoundingClientRect(),
                  o = E.getBoundingClientRect();
                if ("rtl" !== a.dir) {
                  let r = o.left - t.left,
                    i = n.left - r,
                    l = e.left - i,
                    a = e.width + l,
                    c = Math.max(a, t.width),
                    d = window.innerWidth - 10,
                    f = u(i, [10, d - c]);
                  (s.style.minWidth = a + "px"), (s.style.left = f + "px");
                } else {
                  let r = t.right - o.right,
                    i = window.innerWidth - n.right - r,
                    l = window.innerWidth - e.right - i,
                    a = e.width + l,
                    c = Math.max(a, t.width),
                    d = window.innerWidth - 10,
                    f = u(i, [10, d - c]);
                  (s.style.minWidth = a + "px"), (s.style.right = f + "px");
                }
                let i = g(),
                  l = window.innerHeight - 20,
                  c = b.scrollHeight,
                  d = window.getComputedStyle(p),
                  f = parseInt(d.borderTopWidth, 10),
                  m = parseInt(d.paddingTop, 10),
                  v = parseInt(d.borderBottomWidth, 10),
                  h = parseInt(d.paddingBottom, 10),
                  w = f + m + c + h + v,
                  C = Math.min(5 * x.offsetHeight, w),
                  S = window.getComputedStyle(b),
                  R = parseInt(S.paddingTop, 10),
                  k = parseInt(S.paddingBottom, 10),
                  T = e.top + e.height / 2 - 10,
                  P = x.offsetHeight / 2,
                  L = x.offsetTop + P,
                  M = f + m + L;
                if (M <= T) {
                  let e = x === i[i.length - 1].ref.current;
                  s.style.bottom = "0px";
                  let t = p.clientHeight - b.offsetTop - b.offsetHeight;
                  s.style.height =
                    M + Math.max(l - T, P + (e ? k : 0) + t + v) + "px";
                } else {
                  let e = x === i[0].ref.current;
                  s.style.top = "0px";
                  let t = Math.max(T, f + b.offsetTop + (e ? R : 0) + P);
                  (s.style.height = t + (w - M) + "px"),
                    (b.scrollTop = M - T + b.offsetTop);
                }
                (s.style.margin = "10px 0"),
                  (s.style.minHeight = C + "px"),
                  (s.style.maxHeight = l + "px"),
                  null == r || r(),
                  requestAnimationFrame(() => (y.current = !0));
              }
            }, [g, a.trigger, a.valueNode, s, p, b, x, E, a.dir, r]);
          (0, _.b)(() => S(), [S]);
          let [R, k] = (0, l.useState)();
          (0, _.b)(() => {
            p && k(window.getComputedStyle(p).zIndex);
          }, [p]);
          let T = (0, l.useCallback)(
            (e) => {
              e &&
                !0 === w.current &&
                (S(), null == C || C(), (w.current = !1));
            },
            [S, C],
          );
          return (0, l.createElement)(
            eM,
            {
              scope: n,
              contentWrapper: s,
              shouldExpandOnScrollRef: y,
              onScrollButtonChange: T,
            },
            (0, l.createElement)(
              "div",
              {
                ref: f,
                style: {
                  display: "flex",
                  flexDirection: "column",
                  position: "fixed",
                  zIndex: R,
                },
              },
              (0, l.createElement)(
                m.WV.div,
                (0, i.Z)({}, o, {
                  ref: h,
                  style: {
                    boxSizing: "border-box",
                    maxHeight: "100%",
                    ...o.style,
                  },
                }),
              ),
            ),
          );
        }),
        eL = (0, l.forwardRef)((e, t) => {
          let {
              __scopeSelect: n,
              align: r = "start",
              collisionPadding: o = 10,
              ...a
            } = e,
            u = ev(n);
          return (0, l.createElement)(
            $,
            (0, i.Z)({}, u, a, {
              ref: t,
              align: r,
              collisionPadding: o,
              style: {
                boxSizing: "border-box",
                ...a.style,
                "--radix-select-content-transform-origin":
                  "var(--radix-popper-transform-origin)",
                "--radix-select-content-available-width":
                  "var(--radix-popper-available-width)",
                "--radix-select-content-available-height":
                  "var(--radix-popper-available-height)",
                "--radix-select-trigger-width":
                  "var(--radix-popper-anchor-width)",
                "--radix-select-trigger-height":
                  "var(--radix-popper-anchor-height)",
              },
            }),
          );
        }),
        [eM, eA] = ep(eC, {}),
        eO = "SelectViewport",
        eW = (0, l.forwardRef)((e, t) => {
          let { __scopeSelect: n, ...r } = e,
            o = ek(eO, n),
            a = eA(eO, n),
            u = (0, d.e)(t, o.onViewportChange),
            s = (0, l.useRef)(0);
          return (0, l.createElement)(
            l.Fragment,
            null,
            (0, l.createElement)("style", {
              dangerouslySetInnerHTML: {
                __html:
                  "[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}",
              },
            }),
            (0, l.createElement)(
              es.Slot,
              { scope: n },
              (0, l.createElement)(
                m.WV.div,
                (0, i.Z)(
                  { "data-radix-select-viewport": "", role: "presentation" },
                  r,
                  {
                    ref: u,
                    style: {
                      position: "relative",
                      flex: 1,
                      overflow: "auto",
                      ...r.style,
                    },
                    onScroll: (0, c.M)(r.onScroll, (e) => {
                      let t = e.currentTarget,
                        { contentWrapper: n, shouldExpandOnScrollRef: r } = a;
                      if (null != r && r.current && n) {
                        let e = Math.abs(s.current - t.scrollTop);
                        if (e > 0) {
                          let r = window.innerHeight - 20,
                            o = parseFloat(n.style.minHeight),
                            i = parseFloat(n.style.height),
                            l = Math.max(o, i);
                          if (l < r) {
                            let o = l + e,
                              i = Math.min(r, o),
                              a = o - i;
                            (n.style.height = i + "px"),
                              "0px" === n.style.bottom &&
                                ((t.scrollTop = a > 0 ? a : 0),
                                (n.style.justifyContent = "flex-end"));
                          }
                        }
                      }
                      s.current = t.scrollTop;
                    }),
                  },
                ),
              ),
            ),
          );
        }),
        [eD, eI] = ep("SelectGroup"),
        eV = (0, l.forwardRef)((e, t) => {
          let { __scopeSelect: n, ...r } = e,
            o = (0, O.M)();
          return (0, l.createElement)(
            eD,
            { scope: n, id: o },
            (0, l.createElement)(
              m.WV.div,
              (0, i.Z)({ role: "group", "aria-labelledby": o }, r, { ref: t }),
            ),
          );
        }),
        e_ = (0, l.forwardRef)((e, t) => {
          let { __scopeSelect: n, ...r } = e,
            o = eI("SelectLabel", n);
          return (0, l.createElement)(
            m.WV.div,
            (0, i.Z)({ id: o.id }, r, { ref: t }),
          );
        }),
        eF = "SelectItem",
        [eN, eH] = ep(eF),
        eB = (0, l.forwardRef)((e, t) => {
          let {
              __scopeSelect: n,
              value: r,
              disabled: o = !1,
              textValue: a,
              ...u
            } = e,
            s = eg(eF, n),
            f = ek(eF, n),
            p = s.value === r,
            [v, h] = (0, l.useState)(null != a ? a : ""),
            [g, y] = (0, l.useState)(!1),
            w = (0, d.e)(t, (e) => {
              var t;
              return null === (t = f.itemRefCallback) || void 0 === t
                ? void 0
                : t.call(f, e, r, o);
            }),
            b = (0, O.M)(),
            x = () => {
              o || (s.onValueChange(r), s.onOpenChange(!1));
            };
          return (0, l.createElement)(
            eN,
            {
              scope: n,
              value: r,
              disabled: o,
              textId: b,
              isSelected: p,
              onItemTextChange: (0, l.useCallback)((e) => {
                h((t) => {
                  var n;
                  return (
                    t ||
                    (null !== (n = null == e ? void 0 : e.textContent) &&
                    void 0 !== n
                      ? n
                      : ""
                    ).trim()
                  );
                });
              }, []),
            },
            (0, l.createElement)(
              es.ItemSlot,
              { scope: n, value: r, disabled: o, textValue: v },
              (0, l.createElement)(
                m.WV.div,
                (0, i.Z)(
                  {
                    role: "option",
                    "aria-labelledby": b,
                    "data-highlighted": g ? "" : void 0,
                    "aria-selected": p && g,
                    "data-state": p ? "checked" : "unchecked",
                    "aria-disabled": o || void 0,
                    "data-disabled": o ? "" : void 0,
                    tabIndex: o ? void 0 : -1,
                  },
                  u,
                  {
                    ref: w,
                    onFocus: (0, c.M)(u.onFocus, () => y(!0)),
                    onBlur: (0, c.M)(u.onBlur, () => y(!1)),
                    onPointerUp: (0, c.M)(u.onPointerUp, x),
                    onPointerMove: (0, c.M)(u.onPointerMove, (e) => {
                      if (o) {
                        var t;
                        null === (t = f.onItemLeave) ||
                          void 0 === t ||
                          t.call(f);
                      } else e.currentTarget.focus({ preventScroll: !0 });
                    }),
                    onPointerLeave: (0, c.M)(u.onPointerLeave, (e) => {
                      if (e.currentTarget === document.activeElement) {
                        var t;
                        null === (t = f.onItemLeave) ||
                          void 0 === t ||
                          t.call(f);
                      }
                    }),
                    onKeyDown: (0, c.M)(u.onKeyDown, (e) => {
                      var t;
                      let n =
                        (null === (t = f.searchRef) || void 0 === t
                          ? void 0
                          : t.current) !== "";
                      (n && " " === e.key) ||
                        (eu.includes(e.key) && x(),
                        " " === e.key && e.preventDefault());
                    }),
                  },
                ),
              ),
            ),
          );
        }),
        eZ = "SelectItemText",
        ez = (0, l.forwardRef)((e, t) => {
          let { __scopeSelect: n, className: r, style: o, ...u } = e,
            c = eg(eZ, n),
            s = ek(eZ, n),
            f = eH(eZ, n),
            p = ew(eZ, n),
            [v, h] = (0, l.useState)(null),
            g = (0, d.e)(
              t,
              (e) => h(e),
              f.onItemTextChange,
              (e) => {
                var t;
                return null === (t = s.itemTextRefCallback) || void 0 === t
                  ? void 0
                  : t.call(s, e, f.value, f.disabled);
              },
            ),
            y = null == v ? void 0 : v.textContent,
            w = (0, l.useMemo)(
              () =>
                (0, l.createElement)(
                  "option",
                  { key: f.value, value: f.value, disabled: f.disabled },
                  y,
                ),
              [f.disabled, f.value, y],
            ),
            { onNativeOptionAdd: b, onNativeOptionRemove: x } = p;
          return (
            (0, _.b)(() => (b(w), () => x(w)), [b, x, w]),
            (0, l.createElement)(
              l.Fragment,
              null,
              (0, l.createElement)(
                m.WV.span,
                (0, i.Z)({ id: f.textId }, u, { ref: g }),
              ),
              f.isSelected && c.valueNode && !c.valueNodeHasChildren
                ? (0, a.createPortal)(u.children, c.valueNode)
                : null,
            )
          );
        }),
        eK = (0, l.forwardRef)((e, t) => {
          let { __scopeSelect: n, ...r } = e,
            o = eH("SelectItemIndicator", n);
          return o.isSelected
            ? (0, l.createElement)(
                m.WV.span,
                (0, i.Z)({ "aria-hidden": !0 }, r, { ref: t }),
              )
            : null;
        }),
        ej =
          ((e, t) => {
            let { __scopeSelect: n, onAutoScroll: r, ...o } = e,
              a = ek("SelectScrollButton", n),
              u = (0, l.useRef)(null),
              s = ed(n),
              d = (0, l.useCallback)(() => {
                null !== u.current &&
                  (window.clearInterval(u.current), (u.current = null));
              }, []);
            return (
              (0, l.useEffect)(() => () => d(), [d]),
              (0, _.b)(() => {
                var e;
                let t = s().find(
                  (e) => e.ref.current === document.activeElement,
                );
                null == t ||
                  null === (e = t.ref.current) ||
                  void 0 === e ||
                  e.scrollIntoView({ block: "nearest" });
              }, [s]),
              (0, l.createElement)(
                m.WV.div,
                (0, i.Z)({ "aria-hidden": !0 }, o, {
                  ref: t,
                  style: { flexShrink: 0, ...o.style },
                  onPointerDown: (0, c.M)(o.onPointerDown, () => {
                    null === u.current &&
                      (u.current = window.setInterval(r, 50));
                  }),
                  onPointerMove: (0, c.M)(o.onPointerMove, () => {
                    var e;
                    null === (e = a.onItemLeave) || void 0 === e || e.call(a),
                      null === u.current &&
                        (u.current = window.setInterval(r, 50));
                  }),
                  onPointerLeave: (0, c.M)(o.onPointerLeave, () => {
                    d();
                  }),
                }),
              )
            );
          },
          (0, l.forwardRef)((e, t) => {
            let { __scopeSelect: n, ...r } = e;
            return (0, l.createElement)(
              m.WV.div,
              (0, i.Z)({ "aria-hidden": !0 }, r, { ref: t }),
            );
          })),
        eq = (0, l.forwardRef)((e, t) => {
          let { value: n, ...r } = e,
            o = (0, l.useRef)(null),
            a = (0, d.e)(t, o),
            u = (0, er.D)(n);
          return (
            (0, l.useEffect)(() => {
              let e = o.current,
                t = window.HTMLSelectElement.prototype,
                r = Object.getOwnPropertyDescriptor(t, "value"),
                i = r.set;
              if (u !== n && i) {
                let t = new Event("change", { bubbles: !0 });
                i.call(e, n), e.dispatchEvent(t);
              }
            }, [u, n]),
            (0, l.createElement)(
              eo.T,
              { asChild: !0 },
              (0, l.createElement)(
                "select",
                (0, i.Z)({}, r, { ref: a, defaultValue: n }),
              ),
            )
          );
        });
      function eY(e) {
        let t = (0, v.W)(e),
          n = (0, l.useRef)(""),
          r = (0, l.useRef)(0),
          o = (0, l.useCallback)(
            (e) => {
              let o = n.current + e;
              t(o),
                (function e(t) {
                  (n.current = t),
                    window.clearTimeout(r.current),
                    "" !== t &&
                      (r.current = window.setTimeout(() => e(""), 1e3));
                })(o);
            },
            [t],
          ),
          i = (0, l.useCallback)(() => {
            (n.current = ""), window.clearTimeout(r.current);
          }, []);
        return (
          (0, l.useEffect)(() => () => window.clearTimeout(r.current), []),
          [n, o, i]
        );
      }
      function e$(e, t, n) {
        var r;
        let o = t.length > 1 && Array.from(t).every((e) => e === t[0]),
          i = o ? t[0] : t,
          l = n ? e.indexOf(n) : -1,
          a = ((r = Math.max(l, 0)), e.map((t, n) => e[(r + n) % e.length])),
          u = 1 === i.length;
        u && (a = a.filter((e) => e !== n));
        let c = a.find((e) =>
          e.textValue.toLowerCase().startsWith(i.toLowerCase()),
        );
        return c !== n ? c : void 0;
      }
      eq.displayName = "BubbleSelect";
      let eX = (e) => {
          let {
              __scopeSelect: t,
              children: n,
              open: r,
              defaultOpen: o,
              onOpenChange: i,
              value: a,
              defaultValue: u,
              onValueChange: c,
              dir: s,
              name: d,
              autoComplete: f,
              disabled: m,
              required: v,
            } = e,
            h = ev(t),
            [g, y] = (0, l.useState)(null),
            [w, b] = (0, l.useState)(null),
            [x, E] = (0, l.useState)(!1),
            C = (0, p.gm)(s),
            [S = !1, R] = (0, en.T)({ prop: r, defaultProp: o, onChange: i }),
            [k, T] = (0, en.T)({ prop: a, defaultProp: u, onChange: c }),
            P = (0, l.useRef)(null),
            L = !g || !!g.closest("form"),
            [M, A] = (0, l.useState)(new Set()),
            W = Array.from(M)
              .map((e) => e.props.value)
              .join(";");
          return (0, l.createElement)(
            Q,
            h,
            (0, l.createElement)(
              eh,
              {
                required: v,
                scope: t,
                trigger: g,
                onTriggerChange: y,
                valueNode: w,
                onValueNodeChange: b,
                valueNodeHasChildren: x,
                onValueNodeHasChildrenChange: E,
                contentId: (0, O.M)(),
                value: k,
                onValueChange: T,
                open: S,
                onOpenChange: R,
                dir: C,
                triggerPointerDownPosRef: P,
                disabled: m,
              },
              (0, l.createElement)(
                es.Provider,
                { scope: t },
                (0, l.createElement)(
                  ey,
                  {
                    scope: e.__scopeSelect,
                    onNativeOptionAdd: (0, l.useCallback)((e) => {
                      A((t) => new Set(t).add(e));
                    }, []),
                    onNativeOptionRemove: (0, l.useCallback)((e) => {
                      A((t) => {
                        let n = new Set(t);
                        return n.delete(e), n;
                      });
                    }, []),
                  },
                  n,
                ),
              ),
              L
                ? (0, l.createElement)(
                    eq,
                    {
                      key: W,
                      "aria-hidden": !0,
                      required: v,
                      tabIndex: -1,
                      name: d,
                      autoComplete: f,
                      value: k,
                      onChange: (e) => T(e.target.value),
                      disabled: m,
                    },
                    void 0 === k
                      ? (0, l.createElement)("option", { value: "" })
                      : null,
                    Array.from(M),
                  )
                : null,
            ),
          );
        },
        eU = eb,
        eG = ex,
        eJ = eE,
        eQ = (e) => (0, l.createElement)(ee, (0, i.Z)({ asChild: !0 }, e)),
        e0 = eS,
        e1 = eW,
        e2 = eV,
        e3 = e_,
        e4 = eB,
        e5 = ez,
        e7 = eK,
        e9 = ej;
    },
  },
]);
