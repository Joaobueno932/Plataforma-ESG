(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [6155],
  {
    1295: function (e, t, n) {
      "use strict";
      Object.defineProperty(t, "__esModule", { value: !0 }),
        (function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
        })(t, {
          default: function () {
            return u;
          },
          unstable_getImgProps: function () {
            return l;
          },
        });
      let r = n(21024),
        o = n(32301),
        a = n(27873),
        i = n(63222),
        s = r._(n(75033)),
        l = (e) => {
          (0, a.warnOnce)(
            "Warning: unstable_getImgProps() is experimental and may change or be removed at any time. Use at your own risk.",
          );
          let { props: t } = (0, o.getImgProps)(e, {
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
        u = i.Image;
    },
    68278: function () {},
    85886: function (e) {
      e.exports = {
        style: {
          fontFamily:
            "'__myFontMedium_4224fe', '__myFontMedium_Fallback_4224fe'",
        },
        className: "__className_4224fe",
      };
    },
    27968: function (e) {
      e.exports = {
        style: { fontFamily: "'__myFont_154e62', '__myFont_Fallback_154e62'" },
        className: "__className_154e62",
      };
    },
    16691: function (e, t, n) {
      e.exports = n(1295);
    },
    61396: function (e, t, n) {
      e.exports = n(46685);
    },
    26694: function (e, t, n) {
      "use strict";
      n.d(t, {
        Ee: function () {
          return y;
        },
        NY: function () {
          return b;
        },
        fC: function () {
          return w;
        },
      });
      var r = n(13428),
        o = n(2265),
        a = n(56989),
        i = n(16459),
        s = n(51030),
        l = n(9381);
      let u = "Avatar",
        [c, d] = (0, a.b)(u),
        [f, p] = c(u),
        m = (0, o.forwardRef)((e, t) => {
          let { __scopeAvatar: n, ...a } = e,
            [i, s] = (0, o.useState)("idle");
          return (0, o.createElement)(
            f,
            { scope: n, imageLoadingStatus: i, onImageLoadingStatusChange: s },
            (0, o.createElement)(l.WV.span, (0, r.Z)({}, a, { ref: t })),
          );
        }),
        v = (0, o.forwardRef)((e, t) => {
          let {
              __scopeAvatar: n,
              src: a,
              onLoadingStatusChange: u = () => {},
              ...c
            } = e,
            d = p("AvatarImage", n),
            f = (function (e) {
              let [t, n] = (0, o.useState)("idle");
              return (
                (0, s.b)(() => {
                  if (!e) {
                    n("error");
                    return;
                  }
                  let t = !0,
                    r = new window.Image(),
                    o = (e) => () => {
                      t && n(e);
                    };
                  return (
                    n("loading"),
                    (r.onload = o("loaded")),
                    (r.onerror = o("error")),
                    (r.src = e),
                    () => {
                      t = !1;
                    }
                  );
                }, [e]),
                t
              );
            })(a),
            m = (0, i.W)((e) => {
              u(e), d.onImageLoadingStatusChange(e);
            });
          return (
            (0, s.b)(() => {
              "idle" !== f && m(f);
            }, [f, m]),
            "loaded" === f
              ? (0, o.createElement)(
                  l.WV.img,
                  (0, r.Z)({}, c, { ref: t, src: a }),
                )
              : null
          );
        }),
        E = (0, o.forwardRef)((e, t) => {
          let { __scopeAvatar: n, delayMs: a, ...i } = e,
            s = p("AvatarFallback", n),
            [u, c] = (0, o.useState)(void 0 === a);
          return (
            (0, o.useEffect)(() => {
              if (void 0 !== a) {
                let e = window.setTimeout(() => c(!0), a);
                return () => window.clearTimeout(e);
              }
            }, [a]),
            u && "loaded" !== s.imageLoadingStatus
              ? (0, o.createElement)(l.WV.span, (0, r.Z)({}, i, { ref: t }))
              : null
          );
        }),
        w = m,
        y = v,
        b = E;
    },
    66062: function (e, t, n) {
      "use strict";
      n.d(t, {
        fC: function () {
          return C;
        },
        z$: function () {
          return x;
        },
      });
      var r = n(13428),
        o = n(2265),
        a = n(42210),
        i = n(56989),
        s = n(85744),
        l = n(73763),
        u = n(85184),
        c = n(94977),
        d = n(85606),
        f = n(9381);
      let p = "Checkbox",
        [m, v] = (0, i.b)(p),
        [E, w] = m(p),
        y = (0, o.forwardRef)((e, t) => {
          let {
              __scopeCheckbox: n,
              name: i,
              checked: u,
              defaultChecked: c,
              required: d,
              disabled: p,
              value: m = "on",
              onCheckedChange: v,
              ...w
            } = e,
            [y, b] = (0, o.useState)(null),
            C = (0, a.e)(t, (e) => b(e)),
            x = (0, o.useRef)(!1),
            _ = !y || !!y.closest("form"),
            [P = !1, R] = (0, l.T)({ prop: u, defaultProp: c, onChange: v }),
            L = (0, o.useRef)(P);
          return (
            (0, o.useEffect)(() => {
              let e = null == y ? void 0 : y.form;
              if (e) {
                let t = () => R(L.current);
                return (
                  e.addEventListener("reset", t),
                  () => e.removeEventListener("reset", t)
                );
              }
            }, [y, R]),
            (0, o.createElement)(
              E,
              { scope: n, state: P, disabled: p },
              (0, o.createElement)(
                f.WV.button,
                (0, r.Z)(
                  {
                    type: "button",
                    role: "checkbox",
                    "aria-checked": g(P) ? "mixed" : P,
                    "aria-required": d,
                    "data-state": h(P),
                    "data-disabled": p ? "" : void 0,
                    disabled: p,
                    value: m,
                  },
                  w,
                  {
                    ref: C,
                    onKeyDown: (0, s.M)(e.onKeyDown, (e) => {
                      "Enter" === e.key && e.preventDefault();
                    }),
                    onClick: (0, s.M)(e.onClick, (e) => {
                      R((e) => !!g(e) || !e),
                        _ &&
                          ((x.current = e.isPropagationStopped()),
                          x.current || e.stopPropagation());
                    }),
                  },
                ),
              ),
              _ &&
                (0, o.createElement)(T, {
                  control: y,
                  bubbles: !x.current,
                  name: i,
                  value: m,
                  checked: P,
                  required: d,
                  disabled: p,
                  style: { transform: "translateX(-100%)" },
                }),
            )
          );
        }),
        b = (0, o.forwardRef)((e, t) => {
          let { __scopeCheckbox: n, forceMount: a, ...i } = e,
            s = w("CheckboxIndicator", n);
          return (0, o.createElement)(
            d.z,
            { present: a || g(s.state) || !0 === s.state },
            (0, o.createElement)(
              f.WV.span,
              (0, r.Z)(
                {
                  "data-state": h(s.state),
                  "data-disabled": s.disabled ? "" : void 0,
                },
                i,
                { ref: t, style: { pointerEvents: "none", ...e.style } },
              ),
            ),
          );
        }),
        T = (e) => {
          let { control: t, checked: n, bubbles: a = !0, ...i } = e,
            s = (0, o.useRef)(null),
            l = (0, u.D)(n),
            d = (0, c.t)(t);
          return (
            (0, o.useEffect)(() => {
              let e = s.current,
                t = window.HTMLInputElement.prototype,
                r = Object.getOwnPropertyDescriptor(t, "checked"),
                o = r.set;
              if (l !== n && o) {
                let t = new Event("click", { bubbles: a });
                (e.indeterminate = g(n)),
                  o.call(e, !g(n) && n),
                  e.dispatchEvent(t);
              }
            }, [l, n, a]),
            (0, o.createElement)(
              "input",
              (0, r.Z)(
                {
                  type: "checkbox",
                  "aria-hidden": !0,
                  defaultChecked: !g(n) && n,
                },
                i,
                {
                  tabIndex: -1,
                  ref: s,
                  style: {
                    ...e.style,
                    ...d,
                    position: "absolute",
                    pointerEvents: "none",
                    opacity: 0,
                    margin: 0,
                  },
                },
              ),
            )
          );
        };
      function g(e) {
        return "indeterminate" === e;
      }
      function h(e) {
        return g(e) ? "indeterminate" : e ? "checked" : "unchecked";
      }
      let C = y,
        x = b;
    },
    74278: function (e, t, n) {
      "use strict";
      let r;
      n.d(t, {
        I0: function () {
          return y;
        },
        XB: function () {
          return p;
        },
        fC: function () {
          return w;
        },
      });
      var o = n(13428),
        a = n(2265),
        i = n(85744),
        s = n(9381),
        l = n(42210),
        u = n(16459),
        c = n(12488);
      let d = "dismissableLayer.update",
        f = (0, a.createContext)({
          layers: new Set(),
          layersWithOutsidePointerEventsDisabled: new Set(),
          branches: new Set(),
        }),
        p = (0, a.forwardRef)((e, t) => {
          var n;
          let {
              disableOutsidePointerEvents: p = !1,
              onEscapeKeyDown: m,
              onPointerDownOutside: w,
              onFocusOutside: y,
              onInteractOutside: b,
              onDismiss: T,
              ...g
            } = e,
            h = (0, a.useContext)(f),
            [C, x] = (0, a.useState)(null),
            _ =
              null !== (n = null == C ? void 0 : C.ownerDocument) &&
              void 0 !== n
                ? n
                : null == globalThis
                  ? void 0
                  : globalThis.document,
            [, P] = (0, a.useState)({}),
            R = (0, l.e)(t, (e) => x(e)),
            L = Array.from(h.layers),
            [k] = [...h.layersWithOutsidePointerEventsDisabled].slice(-1),
            D = L.indexOf(k),
            S = C ? L.indexOf(C) : -1,
            M = h.layersWithOutsidePointerEventsDisabled.size > 0,
            N = S >= D,
            I = (function (
              e,
              t = null == globalThis ? void 0 : globalThis.document,
            ) {
              let n = (0, u.W)(e),
                r = (0, a.useRef)(!1),
                o = (0, a.useRef)(() => {});
              return (
                (0, a.useEffect)(() => {
                  let e = (e) => {
                      if (e.target && !r.current) {
                        let r = { originalEvent: e };
                        function a() {
                          E("dismissableLayer.pointerDownOutside", n, r, {
                            discrete: !0,
                          });
                        }
                        "touch" === e.pointerType
                          ? (t.removeEventListener("click", o.current),
                            (o.current = a),
                            t.addEventListener("click", o.current, {
                              once: !0,
                            }))
                          : a();
                      } else t.removeEventListener("click", o.current);
                      r.current = !1;
                    },
                    a = window.setTimeout(() => {
                      t.addEventListener("pointerdown", e);
                    }, 0);
                  return () => {
                    window.clearTimeout(a),
                      t.removeEventListener("pointerdown", e),
                      t.removeEventListener("click", o.current);
                  };
                }, [t, n]),
                { onPointerDownCapture: () => (r.current = !0) }
              );
            })((e) => {
              let t = e.target,
                n = [...h.branches].some((e) => e.contains(t));
              !N ||
                n ||
                (null == w || w(e),
                null == b || b(e),
                e.defaultPrevented || null == T || T());
            }, _),
            O = (function (
              e,
              t = null == globalThis ? void 0 : globalThis.document,
            ) {
              let n = (0, u.W)(e),
                r = (0, a.useRef)(!1);
              return (
                (0, a.useEffect)(() => {
                  let e = (e) => {
                    e.target &&
                      !r.current &&
                      E(
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
                n = [...h.branches].some((e) => e.contains(t));
              n ||
                (null == y || y(e),
                null == b || b(e),
                e.defaultPrevented || null == T || T());
            }, _);
          return (
            (0, c.e)((e) => {
              let t = S === h.layers.size - 1;
              t &&
                (null == m || m(e),
                !e.defaultPrevented && T && (e.preventDefault(), T()));
            }, _),
            (0, a.useEffect)(() => {
              if (C)
                return (
                  p &&
                    (0 === h.layersWithOutsidePointerEventsDisabled.size &&
                      ((r = _.body.style.pointerEvents),
                      (_.body.style.pointerEvents = "none")),
                    h.layersWithOutsidePointerEventsDisabled.add(C)),
                  h.layers.add(C),
                  v(),
                  () => {
                    p &&
                      1 === h.layersWithOutsidePointerEventsDisabled.size &&
                      (_.body.style.pointerEvents = r);
                  }
                );
            }, [C, _, p, h]),
            (0, a.useEffect)(
              () => () => {
                C &&
                  (h.layers.delete(C),
                  h.layersWithOutsidePointerEventsDisabled.delete(C),
                  v());
              },
              [C, h],
            ),
            (0, a.useEffect)(() => {
              let e = () => P({});
              return (
                document.addEventListener(d, e),
                () => document.removeEventListener(d, e)
              );
            }, []),
            (0, a.createElement)(
              s.WV.div,
              (0, o.Z)({}, g, {
                ref: R,
                style: {
                  pointerEvents: M ? (N ? "auto" : "none") : void 0,
                  ...e.style,
                },
                onFocusCapture: (0, i.M)(e.onFocusCapture, O.onFocusCapture),
                onBlurCapture: (0, i.M)(e.onBlurCapture, O.onBlurCapture),
                onPointerDownCapture: (0, i.M)(
                  e.onPointerDownCapture,
                  I.onPointerDownCapture,
                ),
              }),
            )
          );
        }),
        m = (0, a.forwardRef)((e, t) => {
          let n = (0, a.useContext)(f),
            r = (0, a.useRef)(null),
            i = (0, l.e)(t, r);
          return (
            (0, a.useEffect)(() => {
              let e = r.current;
              if (e)
                return (
                  n.branches.add(e),
                  () => {
                    n.branches.delete(e);
                  }
                );
            }, [n.branches]),
            (0, a.createElement)(s.WV.div, (0, o.Z)({}, e, { ref: i }))
          );
        });
      function v() {
        let e = new CustomEvent(d);
        document.dispatchEvent(e);
      }
      function E(e, t, n, { discrete: r }) {
        let o = n.originalEvent.target,
          a = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
        t && o.addEventListener(e, t, { once: !0 }),
          r ? (0, s.jH)(o, a) : o.dispatchEvent(a);
      }
      let w = p,
        y = m;
    },
    52730: function (e, t, n) {
      "use strict";
      n.d(t, {
        h: function () {
          return s;
        },
      });
      var r = n(13428),
        o = n(2265),
        a = n(54887),
        i = n(9381);
      let s = (0, o.forwardRef)((e, t) => {
        var n;
        let {
          container: s = null == globalThis
            ? void 0
            : null === (n = globalThis.document) || void 0 === n
              ? void 0
              : n.body,
          ...l
        } = e;
        return s
          ? a.createPortal(
              (0, o.createElement)(i.WV.div, (0, r.Z)({}, l, { ref: t })),
              s,
            )
          : null;
      });
    },
    85606: function (e, t, n) {
      "use strict";
      n.d(t, {
        z: function () {
          return s;
        },
      });
      var r = n(2265),
        o = n(54887),
        a = n(42210),
        i = n(51030);
      let s = (e) => {
        let { present: t, children: n } = e,
          s = (function (e) {
            var t;
            let [n, a] = (0, r.useState)(),
              s = (0, r.useRef)({}),
              u = (0, r.useRef)(e),
              c = (0, r.useRef)("none"),
              d = e ? "mounted" : "unmounted",
              [f, p] =
                ((t = {
                  mounted: {
                    UNMOUNT: "unmounted",
                    ANIMATION_OUT: "unmountSuspended",
                  },
                  unmountSuspended: {
                    MOUNT: "mounted",
                    ANIMATION_END: "unmounted",
                  },
                  unmounted: { MOUNT: "mounted" },
                }),
                (0, r.useReducer)((e, n) => {
                  let r = t[e][n];
                  return null != r ? r : e;
                }, d));
            return (
              (0, r.useEffect)(() => {
                let e = l(s.current);
                c.current = "mounted" === f ? e : "none";
              }, [f]),
              (0, i.b)(() => {
                let t = s.current,
                  n = u.current,
                  r = n !== e;
                if (r) {
                  let r = c.current,
                    o = l(t);
                  e
                    ? p("MOUNT")
                    : "none" === o ||
                        (null == t ? void 0 : t.display) === "none"
                      ? p("UNMOUNT")
                      : n && r !== o
                        ? p("ANIMATION_OUT")
                        : p("UNMOUNT"),
                    (u.current = e);
                }
              }, [e, p]),
              (0, i.b)(() => {
                if (n) {
                  let e = (e) => {
                      let t = l(s.current),
                        r = t.includes(e.animationName);
                      e.target === n &&
                        r &&
                        (0, o.flushSync)(() => p("ANIMATION_END"));
                    },
                    t = (e) => {
                      e.target === n && (c.current = l(s.current));
                    };
                  return (
                    n.addEventListener("animationstart", t),
                    n.addEventListener("animationcancel", e),
                    n.addEventListener("animationend", e),
                    () => {
                      n.removeEventListener("animationstart", t),
                        n.removeEventListener("animationcancel", e),
                        n.removeEventListener("animationend", e);
                    }
                  );
                }
                p("ANIMATION_END");
              }, [n, p]),
              {
                isPresent: ["mounted", "unmountSuspended"].includes(f),
                ref: (0, r.useCallback)((e) => {
                  e && (s.current = getComputedStyle(e)), a(e);
                }, []),
              }
            );
          })(t),
          u =
            "function" == typeof n
              ? n({ present: s.isPresent })
              : r.Children.only(n),
          c = (0, a.e)(s.ref, u.ref),
          d = "function" == typeof n;
        return d || s.isPresent ? (0, r.cloneElement)(u, { ref: c }) : null;
      };
      function l(e) {
        return (null == e ? void 0 : e.animationName) || "none";
      }
      s.displayName = "Presence";
    },
    18361: function (e, t, n) {
      "use strict";
      n.d(t, {
        Dx: function () {
          return X;
        },
        aU: function () {
          return G;
        },
        dk: function () {
          return Y;
        },
        fC: function () {
          return H;
        },
        l_: function () {
          return q;
        },
        x8: function () {
          return J;
        },
        zt: function () {
          return B;
        },
      });
      var r = n(13428),
        o = n(2265),
        a = n(54887),
        i = n(85744),
        s = n(42210),
        l = n(27733),
        u = n(56989),
        c = n(74278),
        d = n(52730),
        f = n(85606),
        p = n(9381),
        m = n(16459),
        v = n(73763),
        E = n(51030),
        w = n(8281);
      let y = "ToastProvider",
        [b, T, g] = (0, l.B)("Toast"),
        [h, C] = (0, u.b)("Toast", [g]),
        [x, _] = h(y),
        P = (e) => {
          let {
              __scopeToast: t,
              label: n = "Notification",
              duration: r = 5e3,
              swipeDirection: a = "right",
              swipeThreshold: i = 50,
              children: s,
            } = e,
            [l, u] = (0, o.useState)(null),
            [c, d] = (0, o.useState)(0),
            f = (0, o.useRef)(!1),
            p = (0, o.useRef)(!1);
          return (0, o.createElement)(
            b.Provider,
            { scope: t },
            (0, o.createElement)(
              x,
              {
                scope: t,
                label: n,
                duration: r,
                swipeDirection: a,
                swipeThreshold: i,
                toastCount: c,
                viewport: l,
                onViewportChange: u,
                onToastAdd: (0, o.useCallback)(() => d((e) => e + 1), []),
                onToastRemove: (0, o.useCallback)(() => d((e) => e - 1), []),
                isFocusedToastEscapeKeyDownRef: f,
                isClosePausedRef: p,
              },
              s,
            ),
          );
        };
      P.propTypes = {
        label(e) {
          if (e.label && "string" == typeof e.label && !e.label.trim()) {
            let e = `Invalid prop \`label\` supplied to \`${y}\`. Expected non-empty \`string\`.`;
            return Error(e);
          }
          return null;
        },
      };
      let R = ["F8"],
        L = "toast.viewportPause",
        k = "toast.viewportResume",
        D = (0, o.forwardRef)((e, t) => {
          let {
              __scopeToast: n,
              hotkey: a = R,
              label: i = "Notifications ({hotkey})",
              ...l
            } = e,
            u = _("ToastViewport", n),
            d = T(n),
            f = (0, o.useRef)(null),
            m = (0, o.useRef)(null),
            v = (0, o.useRef)(null),
            E = (0, o.useRef)(null),
            w = (0, s.e)(t, E, u.onViewportChange),
            y = a.join("+").replace(/Key/g, "").replace(/Digit/g, ""),
            g = u.toastCount > 0;
          (0, o.useEffect)(() => {
            let e = (e) => {
              var t;
              let n = a.every((t) => e[t] || e.code === t);
              n && (null === (t = E.current) || void 0 === t || t.focus());
            };
            return (
              document.addEventListener("keydown", e),
              () => document.removeEventListener("keydown", e)
            );
          }, [a]),
            (0, o.useEffect)(() => {
              let e = f.current,
                t = E.current;
              if (g && e && t) {
                let n = () => {
                    if (!u.isClosePausedRef.current) {
                      let e = new CustomEvent(L);
                      t.dispatchEvent(e), (u.isClosePausedRef.current = !0);
                    }
                  },
                  r = () => {
                    if (u.isClosePausedRef.current) {
                      let e = new CustomEvent(k);
                      t.dispatchEvent(e), (u.isClosePausedRef.current = !1);
                    }
                  },
                  o = (t) => {
                    let n = !e.contains(t.relatedTarget);
                    n && r();
                  },
                  a = () => {
                    let t = e.contains(document.activeElement);
                    t || r();
                  };
                return (
                  e.addEventListener("focusin", n),
                  e.addEventListener("focusout", o),
                  e.addEventListener("pointermove", n),
                  e.addEventListener("pointerleave", a),
                  window.addEventListener("blur", n),
                  window.addEventListener("focus", r),
                  () => {
                    e.removeEventListener("focusin", n),
                      e.removeEventListener("focusout", o),
                      e.removeEventListener("pointermove", n),
                      e.removeEventListener("pointerleave", a),
                      window.removeEventListener("blur", n),
                      window.removeEventListener("focus", r);
                  }
                );
              }
            }, [g, u.isClosePausedRef]);
          let h = (0, o.useCallback)(
            ({ tabbingDirection: e }) => {
              let t = d(),
                n = t.map((t) => {
                  let n = t.ref.current,
                    r = [
                      n,
                      ...(function (e) {
                        let t = [],
                          n = document.createTreeWalker(
                            e,
                            NodeFilter.SHOW_ELEMENT,
                            {
                              acceptNode: (e) => {
                                let t =
                                  "INPUT" === e.tagName && "hidden" === e.type;
                                return e.disabled || e.hidden || t
                                  ? NodeFilter.FILTER_SKIP
                                  : e.tabIndex >= 0
                                    ? NodeFilter.FILTER_ACCEPT
                                    : NodeFilter.FILTER_SKIP;
                              },
                            },
                          );
                        for (; n.nextNode(); ) t.push(n.currentNode);
                        return t;
                      })(n),
                    ];
                  return "forwards" === e ? r : r.reverse();
                });
              return ("forwards" === e ? n.reverse() : n).flat();
            },
            [d],
          );
          return (
            (0, o.useEffect)(() => {
              let e = E.current;
              if (e) {
                let t = (t) => {
                  let n = t.altKey || t.ctrlKey || t.metaKey,
                    r = "Tab" === t.key && !n;
                  if (r) {
                    var o, a, i;
                    let n = document.activeElement,
                      r = t.shiftKey,
                      s = t.target === e;
                    if (s && r) {
                      null === (o = m.current) || void 0 === o || o.focus();
                      return;
                    }
                    let l = h({
                        tabbingDirection: r ? "backwards" : "forwards",
                      }),
                      u = l.findIndex((e) => e === n);
                    $(l.slice(u + 1))
                      ? t.preventDefault()
                      : r
                        ? null === (a = m.current) || void 0 === a || a.focus()
                        : null === (i = v.current) || void 0 === i || i.focus();
                  }
                };
                return (
                  e.addEventListener("keydown", t),
                  () => e.removeEventListener("keydown", t)
                );
              }
            }, [d, h]),
            (0, o.createElement)(
              c.I0,
              {
                ref: f,
                role: "region",
                "aria-label": i.replace("{hotkey}", y),
                tabIndex: -1,
                style: { pointerEvents: g ? void 0 : "none" },
              },
              g &&
                (0, o.createElement)(S, {
                  ref: m,
                  onFocusFromOutsideViewport: () => {
                    let e = h({ tabbingDirection: "forwards" });
                    $(e);
                  },
                }),
              (0, o.createElement)(
                b.Slot,
                { scope: n },
                (0, o.createElement)(
                  p.WV.ol,
                  (0, r.Z)({ tabIndex: -1 }, l, { ref: w }),
                ),
              ),
              g &&
                (0, o.createElement)(S, {
                  ref: v,
                  onFocusFromOutsideViewport: () => {
                    let e = h({ tabbingDirection: "backwards" });
                    $(e);
                  },
                }),
            )
          );
        }),
        S = (0, o.forwardRef)((e, t) => {
          let { __scopeToast: n, onFocusFromOutsideViewport: a, ...i } = e,
            s = _("ToastFocusProxy", n);
          return (0, o.createElement)(
            w.T,
            (0, r.Z)({ "aria-hidden": !0, tabIndex: 0 }, i, {
              ref: t,
              style: { position: "fixed" },
              onFocus: (e) => {
                var t;
                let n = e.relatedTarget,
                  r = !(
                    null !== (t = s.viewport) &&
                    void 0 !== t &&
                    t.contains(n)
                  );
                r && a();
              },
            }),
          );
        }),
        M = "Toast",
        N = (0, o.forwardRef)((e, t) => {
          let {
              forceMount: n,
              open: a,
              defaultOpen: s,
              onOpenChange: l,
              ...u
            } = e,
            [c = !0, d] = (0, v.T)({ prop: a, defaultProp: s, onChange: l });
          return (0, o.createElement)(
            f.z,
            { present: n || c },
            (0, o.createElement)(
              F,
              (0, r.Z)({ open: c }, u, {
                ref: t,
                onClose: () => d(!1),
                onPause: (0, m.W)(e.onPause),
                onResume: (0, m.W)(e.onResume),
                onSwipeStart: (0, i.M)(e.onSwipeStart, (e) => {
                  e.currentTarget.setAttribute("data-swipe", "start");
                }),
                onSwipeMove: (0, i.M)(e.onSwipeMove, (e) => {
                  let { x: t, y: n } = e.detail.delta;
                  e.currentTarget.setAttribute("data-swipe", "move"),
                    e.currentTarget.style.setProperty(
                      "--radix-toast-swipe-move-x",
                      `${t}px`,
                    ),
                    e.currentTarget.style.setProperty(
                      "--radix-toast-swipe-move-y",
                      `${n}px`,
                    );
                }),
                onSwipeCancel: (0, i.M)(e.onSwipeCancel, (e) => {
                  e.currentTarget.setAttribute("data-swipe", "cancel"),
                    e.currentTarget.style.removeProperty(
                      "--radix-toast-swipe-move-x",
                    ),
                    e.currentTarget.style.removeProperty(
                      "--radix-toast-swipe-move-y",
                    ),
                    e.currentTarget.style.removeProperty(
                      "--radix-toast-swipe-end-x",
                    ),
                    e.currentTarget.style.removeProperty(
                      "--radix-toast-swipe-end-y",
                    );
                }),
                onSwipeEnd: (0, i.M)(e.onSwipeEnd, (e) => {
                  let { x: t, y: n } = e.detail.delta;
                  e.currentTarget.setAttribute("data-swipe", "end"),
                    e.currentTarget.style.removeProperty(
                      "--radix-toast-swipe-move-x",
                    ),
                    e.currentTarget.style.removeProperty(
                      "--radix-toast-swipe-move-y",
                    ),
                    e.currentTarget.style.setProperty(
                      "--radix-toast-swipe-end-x",
                      `${t}px`,
                    ),
                    e.currentTarget.style.setProperty(
                      "--radix-toast-swipe-end-y",
                      `${n}px`,
                    ),
                    d(!1);
                }),
              }),
            ),
          );
        }),
        [I, O] = h(M, { onClose() {} }),
        F = (0, o.forwardRef)((e, t) => {
          let {
              __scopeToast: n,
              type: l = "foreground",
              duration: u,
              open: d,
              onClose: f,
              onEscapeKeyDown: v,
              onPause: E,
              onResume: w,
              onSwipeStart: y,
              onSwipeMove: T,
              onSwipeCancel: g,
              onSwipeEnd: h,
              ...C
            } = e,
            x = _(M, n),
            [P, R] = (0, o.useState)(null),
            D = (0, s.e)(t, (e) => R(e)),
            S = (0, o.useRef)(null),
            N = (0, o.useRef)(null),
            O = u || x.duration,
            F = (0, o.useRef)(0),
            W = (0, o.useRef)(O),
            V = (0, o.useRef)(0),
            { onToastAdd: K, onToastRemove: Z } = x,
            U = (0, m.W)(() => {
              var e;
              let t = null == P ? void 0 : P.contains(document.activeElement);
              t && (null === (e = x.viewport) || void 0 === e || e.focus()),
                f();
            }),
            $ = (0, o.useCallback)(
              (e) => {
                e &&
                  e !== 1 / 0 &&
                  (window.clearTimeout(V.current),
                  (F.current = new Date().getTime()),
                  (V.current = window.setTimeout(U, e)));
              },
              [U],
            );
          (0, o.useEffect)(() => {
            let e = x.viewport;
            if (e) {
              let t = () => {
                  $(W.current), null == w || w();
                },
                n = () => {
                  let e = new Date().getTime() - F.current;
                  (W.current = W.current - e),
                    window.clearTimeout(V.current),
                    null == E || E();
                };
              return (
                e.addEventListener(L, n),
                e.addEventListener(k, t),
                () => {
                  e.removeEventListener(L, n), e.removeEventListener(k, t);
                }
              );
            }
          }, [x.viewport, O, E, w, $]),
            (0, o.useEffect)(() => {
              d && !x.isClosePausedRef.current && $(O);
            }, [d, O, x.isClosePausedRef, $]),
            (0, o.useEffect)(() => (K(), () => Z()), [K, Z]);
          let B = (0, o.useMemo)(
            () =>
              P
                ? (function e(t) {
                    let n = [],
                      r = Array.from(t.childNodes);
                    return (
                      r.forEach((t) => {
                        if (
                          (t.nodeType === t.TEXT_NODE &&
                            t.textContent &&
                            n.push(t.textContent),
                          t.nodeType === t.ELEMENT_NODE)
                        ) {
                          let r =
                              t.ariaHidden ||
                              t.hidden ||
                              "none" === t.style.display,
                            o = "" === t.dataset.radixToastAnnounceExclude;
                          if (!r) {
                            if (o) {
                              let e = t.dataset.radixToastAnnounceAlt;
                              e && n.push(e);
                            } else n.push(...e(t));
                          }
                        }
                      }),
                      n
                    );
                  })(P)
                : null,
            [P],
          );
          return x.viewport
            ? (0, o.createElement)(
                o.Fragment,
                null,
                B &&
                  (0, o.createElement)(
                    A,
                    {
                      __scopeToast: n,
                      role: "status",
                      "aria-live": "foreground" === l ? "assertive" : "polite",
                      "aria-atomic": !0,
                    },
                    B,
                  ),
                (0, o.createElement)(
                  I,
                  { scope: n, onClose: U },
                  (0, a.createPortal)(
                    (0, o.createElement)(
                      b.ItemSlot,
                      { scope: n },
                      (0, o.createElement)(
                        c.fC,
                        {
                          asChild: !0,
                          onEscapeKeyDown: (0, i.M)(v, () => {
                            x.isFocusedToastEscapeKeyDownRef.current || U(),
                              (x.isFocusedToastEscapeKeyDownRef.current = !1);
                          }),
                        },
                        (0, o.createElement)(
                          p.WV.li,
                          (0, r.Z)(
                            {
                              role: "status",
                              "aria-live": "off",
                              "aria-atomic": !0,
                              tabIndex: 0,
                              "data-state": d ? "open" : "closed",
                              "data-swipe-direction": x.swipeDirection,
                            },
                            C,
                            {
                              ref: D,
                              style: {
                                userSelect: "none",
                                touchAction: "none",
                                ...e.style,
                              },
                              onKeyDown: (0, i.M)(e.onKeyDown, (e) => {
                                "Escape" !== e.key ||
                                  (null == v || v(e.nativeEvent),
                                  e.nativeEvent.defaultPrevented ||
                                    ((x.isFocusedToastEscapeKeyDownRef.current =
                                      !0),
                                    U()));
                              }),
                              onPointerDown: (0, i.M)(e.onPointerDown, (e) => {
                                0 === e.button &&
                                  (S.current = { x: e.clientX, y: e.clientY });
                              }),
                              onPointerMove: (0, i.M)(e.onPointerMove, (e) => {
                                if (!S.current) return;
                                let t = e.clientX - S.current.x,
                                  n = e.clientY - S.current.y,
                                  r = !!N.current,
                                  o = ["left", "right"].includes(
                                    x.swipeDirection,
                                  ),
                                  a = ["left", "up"].includes(x.swipeDirection)
                                    ? Math.min
                                    : Math.max,
                                  i = o ? a(0, t) : 0,
                                  s = o ? 0 : a(0, n),
                                  l = "touch" === e.pointerType ? 10 : 2,
                                  u = { x: i, y: s },
                                  c = { originalEvent: e, delta: u };
                                r
                                  ? ((N.current = u),
                                    z("toast.swipeMove", T, c, {
                                      discrete: !1,
                                    }))
                                  : j(u, x.swipeDirection, l)
                                    ? ((N.current = u),
                                      z("toast.swipeStart", y, c, {
                                        discrete: !1,
                                      }),
                                      e.target.setPointerCapture(e.pointerId))
                                    : (Math.abs(t) > l || Math.abs(n) > l) &&
                                      (S.current = null);
                              }),
                              onPointerUp: (0, i.M)(e.onPointerUp, (e) => {
                                let t = N.current,
                                  n = e.target;
                                if (
                                  (n.hasPointerCapture(e.pointerId) &&
                                    n.releasePointerCapture(e.pointerId),
                                  (N.current = null),
                                  (S.current = null),
                                  t)
                                ) {
                                  let n = e.currentTarget,
                                    r = { originalEvent: e, delta: t };
                                  j(t, x.swipeDirection, x.swipeThreshold)
                                    ? z("toast.swipeEnd", h, r, {
                                        discrete: !0,
                                      })
                                    : z("toast.swipeCancel", g, r, {
                                        discrete: !0,
                                      }),
                                    n.addEventListener(
                                      "click",
                                      (e) => e.preventDefault(),
                                      { once: !0 },
                                    );
                                }
                              }),
                            },
                          ),
                        ),
                      ),
                    ),
                    x.viewport,
                  ),
                ),
              )
            : null;
        });
      F.propTypes = {
        type(e) {
          if (e.type && !["foreground", "background"].includes(e.type)) {
            let e = `Invalid prop \`type\` supplied to \`${M}\`. Expected \`foreground | background\`.`;
            return Error(e);
          }
          return null;
        },
      };
      let A = (e) => {
          let { __scopeToast: t, children: n, ...r } = e,
            a = _(M, t),
            [i, s] = (0, o.useState)(!1),
            [l, u] = (0, o.useState)(!1);
          return (
            (function (e = () => {}) {
              let t = (0, m.W)(e);
              (0, E.b)(() => {
                let e = 0,
                  n = 0;
                return (
                  (e = window.requestAnimationFrame(
                    () => (n = window.requestAnimationFrame(t)),
                  )),
                  () => {
                    window.cancelAnimationFrame(e),
                      window.cancelAnimationFrame(n);
                  }
                );
              }, [t]);
            })(() => s(!0)),
            (0, o.useEffect)(() => {
              let e = window.setTimeout(() => u(!0), 1e3);
              return () => window.clearTimeout(e);
            }, []),
            l
              ? null
              : (0, o.createElement)(
                  d.h,
                  { asChild: !0 },
                  (0, o.createElement)(
                    w.T,
                    r,
                    i &&
                      (0, o.createElement)(o.Fragment, null, a.label, " ", n),
                  ),
                )
          );
        },
        W = (0, o.forwardRef)((e, t) => {
          let { __scopeToast: n, ...a } = e;
          return (0, o.createElement)(p.WV.div, (0, r.Z)({}, a, { ref: t }));
        }),
        V = (0, o.forwardRef)((e, t) => {
          let { __scopeToast: n, ...a } = e;
          return (0, o.createElement)(p.WV.div, (0, r.Z)({}, a, { ref: t }));
        }),
        K = (0, o.forwardRef)((e, t) => {
          let { altText: n, ...a } = e;
          return n
            ? (0, o.createElement)(
                U,
                { altText: n, asChild: !0 },
                (0, o.createElement)(Z, (0, r.Z)({}, a, { ref: t })),
              )
            : null;
        });
      K.propTypes = {
        altText: (e) =>
          e.altText
            ? null
            : Error("Missing prop `altText` expected on `ToastAction`"),
      };
      let Z = (0, o.forwardRef)((e, t) => {
          let { __scopeToast: n, ...a } = e,
            s = O("ToastClose", n);
          return (0, o.createElement)(
            U,
            { asChild: !0 },
            (0, o.createElement)(
              p.WV.button,
              (0, r.Z)({ type: "button" }, a, {
                ref: t,
                onClick: (0, i.M)(e.onClick, s.onClose),
              }),
            ),
          );
        }),
        U = (0, o.forwardRef)((e, t) => {
          let { __scopeToast: n, altText: a, ...i } = e;
          return (0, o.createElement)(
            p.WV.div,
            (0, r.Z)(
              {
                "data-radix-toast-announce-exclude": "",
                "data-radix-toast-announce-alt": a || void 0,
              },
              i,
              { ref: t },
            ),
          );
        });
      function z(e, t, n, { discrete: r }) {
        let o = n.originalEvent.currentTarget,
          a = new CustomEvent(e, { bubbles: !0, cancelable: !0, detail: n });
        t && o.addEventListener(e, t, { once: !0 }),
          r ? (0, p.jH)(o, a) : o.dispatchEvent(a);
      }
      let j = (e, t, n = 0) => {
        let r = Math.abs(e.x),
          o = Math.abs(e.y),
          a = r > o;
        return "left" === t || "right" === t ? a && r > n : !a && o > n;
      };
      function $(e) {
        let t = document.activeElement;
        return e.some(
          (e) => e === t || (e.focus(), document.activeElement !== t),
        );
      }
      let B = P,
        q = D,
        H = N,
        X = W,
        Y = V,
        G = K,
        J = Z;
    },
  },
]);
