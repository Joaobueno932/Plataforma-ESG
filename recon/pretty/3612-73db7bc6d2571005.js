(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [3612],
  {
    31010: function (e, t) {
      !(function (e) {
        "use strict";
        var t = Object.freeze({
          __proto__: null,
          mask: ({ locale: e, currency: t, value: n }) => {
            let { format: r } = new Intl.NumberFormat(`${e}`, {
              style: "currency",
              currency: t,
            });
            return r(n);
          },
          unmask: ({ locale: e, currency: t, value: n }) => {
            let r = new Intl.NumberFormat(e, {
                style: "currency",
                currency: t,
              }),
              o = `${n}`.replace(/[^0-9\-]/g, ""),
              a = r.formatToParts(1.1),
              l = a.find((e) => "fraction" === e.type);
            return l ? parseInt(o) / (10 * parseInt(l.value)) : parseInt(o);
          },
        });
        let n = {
            9: new RegExp(/[0-9]/),
            A: new RegExp(/[a-zA-Z]/),
            S: new RegExp(/[0-9a-zA-Z]/),
          },
          r = (e) => e.replace(/[^0-9a-zA-Z]/g, ""),
          o = (e, t, o) => {
            let a = t.split(""),
              l = r(String(e)),
              u = [],
              i = 0;
            for (let e = 0; e < a.length; e++) {
              let r = t[e],
                c = l[i],
                d = n[r];
              if (c === r) {
                (u[e] = c), i++;
                continue;
              }
              if (!d) {
                u[e] = r;
                continue;
              }
              if (c && d.test(c)) {
                (u[e] = c), i++;
                continue;
              }
              if (o?.placeholder) {
                u[e] = o.placeholder;
                continue;
              }
              u.length < a.length && /\W/.test(u[u.length - 1]) && u.pop();
              break;
            }
            return u.join("");
          },
          a = (e, t, n) =>
            o(
              e,
              t.reduce((t, n) => (e.length <= r(t).length ? t : n), t[0]),
              n,
            );
        (e.currency = t),
          (e.mask = (e, t, n) =>
            "string" == typeof t ? o(e, t || "", n) : a(e, t, n)),
          (e.unMask = r),
          (e.unmask = r);
      })(t);
    },
    74278: function (e, t, n) {
      "use strict";
      let r;
      n.d(t, {
        I0: function () {
          return w;
        },
        XB: function () {
          return p;
        },
        fC: function () {
          return h;
        },
      });
      var o = n(13428),
        a = n(2265),
        l = n(85744),
        u = n(9381),
        i = n(42210),
        c = n(16459),
        d = n(12488);
      let s = "dismissableLayer.update",
        f = (0, a.createContext)({
          layers: new Set(),
          layersWithOutsidePointerEventsDisabled: new Set(),
          branches: new Set(),
        }),
        p = (0, a.forwardRef)((e, t) => {
          var n;
          let {
              disableOutsidePointerEvents: p = !1,
              onEscapeKeyDown: v,
              onPointerDownOutside: h,
              onFocusOutside: w,
              onInteractOutside: E,
              onDismiss: b,
              ...y
            } = e,
            _ = (0, a.useContext)(f),
            [M, C] = (0, a.useState)(null),
            R =
              null !== (n = null == M ? void 0 : M.ownerDocument) &&
              void 0 !== n
                ? n
                : null == globalThis
                  ? void 0
                  : globalThis.document,
            [, D] = (0, a.useState)({}),
            x = (0, i.e)(t, (e) => C(e)),
            P = Array.from(_.layers),
            [O] = [..._.layersWithOutsidePointerEventsDisabled].slice(-1),
            T = P.indexOf(O),
            k = M ? P.indexOf(M) : -1,
            I = _.layersWithOutsidePointerEventsDisabled.size > 0,
            F = k >= T,
            S = (function (
              e,
              t = null == globalThis ? void 0 : globalThis.document,
            ) {
              let n = (0, c.W)(e),
                r = (0, a.useRef)(!1),
                o = (0, a.useRef)(() => {});
              return (
                (0, a.useEffect)(() => {
                  let e = (e) => {
                      if (e.target && !r.current) {
                        let r = { originalEvent: e };
                        function a() {
                          g("dismissableLayer.pointerDownOutside", n, r, {
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
                n = [..._.branches].some((e) => e.contains(t));
              !F ||
                n ||
                (null == h || h(e),
                null == E || E(e),
                e.defaultPrevented || null == b || b());
            }, R),
            A = (function (
              e,
              t = null == globalThis ? void 0 : globalThis.document,
            ) {
              let n = (0, c.W)(e),
                r = (0, a.useRef)(!1);
              return (
                (0, a.useEffect)(() => {
                  let e = (e) => {
                    e.target &&
                      !r.current &&
                      g(
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
                n = [..._.branches].some((e) => e.contains(t));
              n ||
                (null == w || w(e),
                null == E || E(e),
                e.defaultPrevented || null == b || b());
            }, R);
          return (
            (0, d.e)((e) => {
              let t = k === _.layers.size - 1;
              t &&
                (null == v || v(e),
                !e.defaultPrevented && b && (e.preventDefault(), b()));
            }, R),
            (0, a.useEffect)(() => {
              if (M)
                return (
                  p &&
                    (0 === _.layersWithOutsidePointerEventsDisabled.size &&
                      ((r = R.body.style.pointerEvents),
                      (R.body.style.pointerEvents = "none")),
                    _.layersWithOutsidePointerEventsDisabled.add(M)),
                  _.layers.add(M),
                  m(),
                  () => {
                    p &&
                      1 === _.layersWithOutsidePointerEventsDisabled.size &&
                      (R.body.style.pointerEvents = r);
                  }
                );
            }, [M, R, p, _]),
            (0, a.useEffect)(
              () => () => {
                M &&
                  (_.layers.delete(M),
                  _.layersWithOutsidePointerEventsDisabled.delete(M),
                  m());
              },
              [M, _],
            ),
            (0, a.useEffect)(() => {
              let e = () => D({});
              return (
                document.addEventListener(s, e),
                () => document.removeEventListener(s, e)
              );
            }, []),
            (0, a.createElement)(
              u.WV.div,
              (0, o.Z)({}, y, {
                ref: x,
                style: {
                  pointerEvents: I ? (F ? "auto" : "none") : void 0,
                  ...e.style,
                },
                onFocusCapture: (0, l.M)(e.onFocusCapture, A.onFocusCapture),
                onBlurCapture: (0, l.M)(e.onBlurCapture, A.onBlurCapture),
                onPointerDownCapture: (0, l.M)(
                  e.onPointerDownCapture,
                  S.onPointerDownCapture,
                ),
              }),
            )
          );
        }),
        v = (0, a.forwardRef)((e, t) => {
          let n = (0, a.useContext)(f),
            r = (0, a.useRef)(null),
            l = (0, i.e)(t, r);
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
            (0, a.createElement)(u.WV.div, (0, o.Z)({}, e, { ref: l }))
          );
        });
      function m() {
        let e = new CustomEvent(s);
        document.dispatchEvent(e);
      }
      function g(e, t, n, { discrete: r }) {
        let o = n.originalEvent.target,
          a = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
        t && o.addEventListener(e, t, { once: !0 }),
          r ? (0, u.jH)(o, a) : o.dispatchEvent(a);
      }
      let h = p,
        w = v;
    },
    21291: function (e, t, n) {
      "use strict";
      let r;
      n.d(t, {
        oC: function () {
          return tI;
        },
        VY: function () {
          return tP;
        },
        ZA: function () {
          return tO;
        },
        ck: function () {
          return tk;
        },
        wU: function () {
          return tA;
        },
        __: function () {
          return tT;
        },
        Uv: function () {
          return tx;
        },
        Ee: function () {
          return tF;
        },
        Rk: function () {
          return tS;
        },
        fC: function () {
          return tR;
        },
        Z0: function () {
          return tL;
        },
        Tr: function () {
          return tZ;
        },
        tu: function () {
          return tK;
        },
        fF: function () {
          return tW;
        },
        xz: function () {
          return tD;
        },
      });
      var o = n(13428),
        a = n(2265),
        l = n(85744),
        u = n(42210),
        i = n(56989),
        c = n(73763),
        d = n(9381),
        s = n(27733),
        f = n(65400),
        p = n(74278),
        v = n(31244),
        m = n(16459);
      let g = "focusScope.autoFocusOnMount",
        h = "focusScope.autoFocusOnUnmount",
        w = { bubbles: !1, cancelable: !0 },
        E = (0, a.forwardRef)((e, t) => {
          let {
              loop: n = !1,
              trapped: r = !1,
              onMountAutoFocus: l,
              onUnmountAutoFocus: i,
              ...c
            } = e,
            [s, f] = (0, a.useState)(null),
            p = (0, m.W)(l),
            v = (0, m.W)(i),
            E = (0, a.useRef)(null),
            C = (0, u.e)(t, (e) => f(e)),
            R = (0, a.useRef)({
              paused: !1,
              pause() {
                this.paused = !0;
              },
              resume() {
                this.paused = !1;
              },
            }).current;
          (0, a.useEffect)(() => {
            if (r) {
              function e(e) {
                if (R.paused || !s) return;
                let t = e.target;
                s.contains(t) ? (E.current = t) : _(E.current, { select: !0 });
              }
              function t(e) {
                if (R.paused || !s) return;
                let t = e.relatedTarget;
                null === t || s.contains(t) || _(E.current, { select: !0 });
              }
              document.addEventListener("focusin", e),
                document.addEventListener("focusout", t);
              let n = new MutationObserver(function (e) {
                let t = document.activeElement;
                if (t === document.body)
                  for (let t of e) t.removedNodes.length > 0 && _(s);
              });
              return (
                s && n.observe(s, { childList: !0, subtree: !0 }),
                () => {
                  document.removeEventListener("focusin", e),
                    document.removeEventListener("focusout", t),
                    n.disconnect();
                }
              );
            }
          }, [r, s, R.paused]),
            (0, a.useEffect)(() => {
              if (s) {
                M.add(R);
                let e = document.activeElement,
                  t = s.contains(e);
                if (!t) {
                  let t = new CustomEvent(g, w);
                  s.addEventListener(g, p),
                    s.dispatchEvent(t),
                    t.defaultPrevented ||
                      ((function (e, { select: t = !1 } = {}) {
                        let n = document.activeElement;
                        for (let r of e)
                          if (
                            (_(r, { select: t }), document.activeElement !== n)
                          )
                            return;
                      })(
                        b(s).filter((e) => "A" !== e.tagName),
                        { select: !0 },
                      ),
                      document.activeElement === e && _(s));
                }
                return () => {
                  s.removeEventListener(g, p),
                    setTimeout(() => {
                      let t = new CustomEvent(h, w);
                      s.addEventListener(h, v),
                        s.dispatchEvent(t),
                        t.defaultPrevented ||
                          _(null != e ? e : document.body, { select: !0 }),
                        s.removeEventListener(h, v),
                        M.remove(R);
                    }, 0);
                };
              }
            }, [s, p, v, R]);
          let D = (0, a.useCallback)(
            (e) => {
              if ((!n && !r) || R.paused) return;
              let t = "Tab" === e.key && !e.altKey && !e.ctrlKey && !e.metaKey,
                o = document.activeElement;
              if (t && o) {
                let t = e.currentTarget,
                  [r, a] = (function (e) {
                    let t = b(e),
                      n = y(t, e),
                      r = y(t.reverse(), e);
                    return [n, r];
                  })(t),
                  l = r && a;
                l
                  ? e.shiftKey || o !== a
                    ? e.shiftKey &&
                      o === r &&
                      (e.preventDefault(), n && _(a, { select: !0 }))
                    : (e.preventDefault(), n && _(r, { select: !0 }))
                  : o === t && e.preventDefault();
              }
            },
            [n, r, R.paused],
          );
          return (0, a.createElement)(
            d.WV.div,
            (0, o.Z)({ tabIndex: -1 }, c, { ref: C, onKeyDown: D }),
          );
        });
      function b(e) {
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
      function y(e, t) {
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
      function _(e, { select: t = !1 } = {}) {
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
        ((r = []),
        {
          add(e) {
            let t = r[0];
            e !== t && (null == t || t.pause()), (r = C(r, e)).unshift(e);
          },
          remove(e) {
            var t;
            null === (t = (r = C(r, e))[0]) || void 0 === t || t.resume();
          },
        });
      function C(e, t) {
        let n = [...e],
          r = n.indexOf(t);
        return -1 !== r && n.splice(r, 1), n;
      }
      var R = n(20966),
        D = n(33136),
        x = n(73961),
        P = n(49473),
        O = n(99279),
        T = n(51030),
        k = n(94977);
      let I = "Popper",
        [F, S] = (0, i.b)(I),
        [A, L] = F(I),
        Z = (0, a.forwardRef)((e, t) => {
          let { __scopePopper: n, virtualRef: r, ...l } = e,
            i = L("PopperAnchor", n),
            c = (0, a.useRef)(null),
            s = (0, u.e)(t, c);
          return (
            (0, a.useEffect)(() => {
              i.onAnchorChange((null == r ? void 0 : r.current) || c.current);
            }),
            r
              ? null
              : (0, a.createElement)(d.WV.div, (0, o.Z)({}, l, { ref: s }))
          );
        }),
        W = "PopperContent",
        [K, V] = F(W),
        z = (0, a.forwardRef)((e, t) => {
          var n, r, l, i, c, s, f, p;
          let {
              __scopePopper: v,
              side: g = "bottom",
              sideOffset: h = 0,
              align: w = "center",
              alignOffset: E = 0,
              arrowPadding: b = 0,
              avoidCollisions: y = !0,
              collisionBoundary: _ = [],
              collisionPadding: M = 0,
              sticky: C = "partial",
              hideWhenDetached: R = !1,
              updatePositionStrategy: O = "optimized",
              onPlaced: I,
              ...F
            } = e,
            S = L(W, v),
            [A, Z] = (0, a.useState)(null),
            V = (0, u.e)(t, (e) => Z(e)),
            [z, B] = (0, a.useState)(null),
            G = (0, k.t)(z),
            H =
              null !== (n = null == G ? void 0 : G.width) && void 0 !== n
                ? n
                : 0,
            X =
              null !== (r = null == G ? void 0 : G.height) && void 0 !== r
                ? r
                : 0,
            Y =
              "number" == typeof M
                ? M
                : { top: 0, right: 0, bottom: 0, left: 0, ...M },
            j = Array.isArray(_) ? _ : [_],
            q = j.length > 0,
            J = { padding: Y, boundary: j.filter(N), altBoundary: q },
            {
              refs: Q,
              floatingStyles: ee,
              placement: et,
              isPositioned: en,
              middlewareData: er,
            } = (0, D.YF)({
              strategy: "fixed",
              placement: g + ("center" !== w ? "-" + w : ""),
              whileElementsMounted: (...e) => {
                let t = (0, x.Me)(...e, { animationFrame: "always" === O });
                return t;
              },
              elements: { reference: S.anchor },
              middleware: [
                (0, P.cv)({ mainAxis: h + X, alignmentAxis: E }),
                y &&
                  (0, P.uY)({
                    mainAxis: !0,
                    crossAxis: !1,
                    limiter: "partial" === C ? (0, P.dr)() : void 0,
                    ...J,
                  }),
                y && (0, P.RR)({ ...J }),
                (0, P.dp)({
                  ...J,
                  apply: ({
                    elements: e,
                    rects: t,
                    availableWidth: n,
                    availableHeight: r,
                  }) => {
                    let { width: o, height: a } = t.reference,
                      l = e.floating.style;
                    l.setProperty("--radix-popper-available-width", `${n}px`),
                      l.setProperty(
                        "--radix-popper-available-height",
                        `${r}px`,
                      ),
                      l.setProperty("--radix-popper-anchor-width", `${o}px`),
                      l.setProperty("--radix-popper-anchor-height", `${a}px`);
                  },
                }),
                z && (0, D.x7)({ element: z, padding: b }),
                U({ arrowWidth: H, arrowHeight: X }),
                R && (0, P.Cp)({ strategy: "referenceHidden", ...J }),
              ],
            }),
            [eo, ea] = $(et),
            el = (0, m.W)(I);
          (0, T.b)(() => {
            en && (null == el || el());
          }, [en, el]);
          let eu = null === (l = er.arrow) || void 0 === l ? void 0 : l.x,
            ei = null === (i = er.arrow) || void 0 === i ? void 0 : i.y,
            ec =
              (null === (c = er.arrow) || void 0 === c
                ? void 0
                : c.centerOffset) !== 0,
            [ed, es] = (0, a.useState)();
          return (
            (0, T.b)(() => {
              A && es(window.getComputedStyle(A).zIndex);
            }, [A]),
            (0, a.createElement)(
              "div",
              {
                ref: Q.setFloating,
                "data-radix-popper-content-wrapper": "",
                style: {
                  ...ee,
                  transform: en ? ee.transform : "translate(0, -200%)",
                  minWidth: "max-content",
                  zIndex: ed,
                  "--radix-popper-transform-origin": [
                    null === (s = er.transformOrigin) || void 0 === s
                      ? void 0
                      : s.x,
                    null === (f = er.transformOrigin) || void 0 === f
                      ? void 0
                      : f.y,
                  ].join(" "),
                },
                dir: e.dir,
              },
              (0, a.createElement)(
                K,
                {
                  scope: v,
                  placedSide: eo,
                  onArrowChange: B,
                  arrowX: eu,
                  arrowY: ei,
                  shouldHideArrow: ec,
                },
                (0, a.createElement)(
                  d.WV.div,
                  (0, o.Z)({ "data-side": eo, "data-align": ea }, F, {
                    ref: V,
                    style: {
                      ...F.style,
                      animation: en ? void 0 : "none",
                      opacity:
                        null !== (p = er.hide) &&
                        void 0 !== p &&
                        p.referenceHidden
                          ? 0
                          : void 0,
                    },
                  }),
                ),
              ),
            )
          );
        }),
        B = { top: "bottom", right: "left", bottom: "top", left: "right" },
        G = (0, a.forwardRef)(function (e, t) {
          let { __scopePopper: n, ...r } = e,
            l = V("PopperArrow", n),
            u = B[l.placedSide];
          return (0, a.createElement)(
            "span",
            {
              ref: l.onArrowChange,
              style: {
                position: "absolute",
                left: l.arrowX,
                top: l.arrowY,
                [u]: 0,
                transformOrigin: {
                  top: "",
                  right: "0 0",
                  bottom: "center 0",
                  left: "100% 0",
                }[l.placedSide],
                transform: {
                  top: "translateY(100%)",
                  right: "translateY(50%) rotate(90deg) translateX(-50%)",
                  bottom: "rotate(180deg)",
                  left: "translateY(50%) rotate(-90deg) translateX(50%)",
                }[l.placedSide],
                visibility: l.shouldHideArrow ? "hidden" : void 0,
              },
            },
            (0, a.createElement)(
              O.f,
              (0, o.Z)({}, r, {
                ref: t,
                style: { ...r.style, display: "block" },
              }),
            ),
          );
        });
      function N(e) {
        return null !== e;
      }
      let U = (e) => ({
        name: "transformOrigin",
        options: e,
        fn(t) {
          var n, r, o, a, l;
          let { placement: u, rects: i, middlewareData: c } = t,
            d =
              (null === (n = c.arrow) || void 0 === n
                ? void 0
                : n.centerOffset) !== 0,
            s = d ? 0 : e.arrowWidth,
            f = d ? 0 : e.arrowHeight,
            [p, v] = $(u),
            m = { start: "0%", center: "50%", end: "100%" }[v],
            g =
              (null !==
                (r = null === (o = c.arrow) || void 0 === o ? void 0 : o.x) &&
              void 0 !== r
                ? r
                : 0) +
              s / 2,
            h =
              (null !==
                (a = null === (l = c.arrow) || void 0 === l ? void 0 : l.y) &&
              void 0 !== a
                ? a
                : 0) +
              f / 2,
            w = "",
            E = "";
          return (
            "bottom" === p
              ? ((w = d ? m : `${g}px`), (E = `${-f}px`))
              : "top" === p
                ? ((w = d ? m : `${g}px`), (E = `${i.floating.height + f}px`))
                : "right" === p
                  ? ((w = `${-f}px`), (E = d ? m : `${h}px`))
                  : "left" === p &&
                    ((w = `${i.floating.width + f}px`), (E = d ? m : `${h}px`)),
            { data: { x: w, y: E } }
          );
        },
      });
      function $(e) {
        let [t, n = "center"] = e.split("-");
        return [t, n];
      }
      let H = (e) => {
        let { __scopePopper: t, children: n } = e,
          [r, o] = (0, a.useState)(null);
        return (0, a.createElement)(
          A,
          { scope: t, anchor: r, onAnchorChange: o },
          n,
        );
      };
      var X = n(52730),
        Y = n(85606);
      let j = "rovingFocusGroup.onEntryFocus",
        q = { bubbles: !1, cancelable: !0 },
        J = "RovingFocusGroup",
        [Q, ee, et] = (0, s.B)(J),
        [en, er] = (0, i.b)(J, [et]),
        [eo, ea] = en(J),
        el = (0, a.forwardRef)((e, t) =>
          (0, a.createElement)(
            Q.Provider,
            { scope: e.__scopeRovingFocusGroup },
            (0, a.createElement)(
              Q.Slot,
              { scope: e.__scopeRovingFocusGroup },
              (0, a.createElement)(eu, (0, o.Z)({}, e, { ref: t })),
            ),
          ),
        ),
        eu = (0, a.forwardRef)((e, t) => {
          let {
              __scopeRovingFocusGroup: n,
              orientation: r,
              loop: i = !1,
              dir: s,
              currentTabStopId: p,
              defaultCurrentTabStopId: v,
              onCurrentTabStopIdChange: g,
              onEntryFocus: h,
              ...w
            } = e,
            E = (0, a.useRef)(null),
            b = (0, u.e)(t, E),
            y = (0, f.gm)(s),
            [_ = null, M] = (0, c.T)({ prop: p, defaultProp: v, onChange: g }),
            [C, R] = (0, a.useState)(!1),
            D = (0, m.W)(h),
            x = ee(n),
            P = (0, a.useRef)(!1),
            [O, T] = (0, a.useState)(0);
          return (
            (0, a.useEffect)(() => {
              let e = E.current;
              if (e)
                return (
                  e.addEventListener(j, D), () => e.removeEventListener(j, D)
                );
            }, [D]),
            (0, a.createElement)(
              eo,
              {
                scope: n,
                orientation: r,
                dir: y,
                loop: i,
                currentTabStopId: _,
                onItemFocus: (0, a.useCallback)((e) => M(e), [M]),
                onItemShiftTab: (0, a.useCallback)(() => R(!0), []),
                onFocusableItemAdd: (0, a.useCallback)(
                  () => T((e) => e + 1),
                  [],
                ),
                onFocusableItemRemove: (0, a.useCallback)(
                  () => T((e) => e - 1),
                  [],
                ),
              },
              (0, a.createElement)(
                d.WV.div,
                (0, o.Z)(
                  { tabIndex: C || 0 === O ? -1 : 0, "data-orientation": r },
                  w,
                  {
                    ref: b,
                    style: { outline: "none", ...e.style },
                    onMouseDown: (0, l.M)(e.onMouseDown, () => {
                      P.current = !0;
                    }),
                    onFocus: (0, l.M)(e.onFocus, (e) => {
                      let t = !P.current;
                      if (e.target === e.currentTarget && t && !C) {
                        let t = new CustomEvent(j, q);
                        if (
                          (e.currentTarget.dispatchEvent(t),
                          !t.defaultPrevented)
                        ) {
                          let e = x().filter((e) => e.focusable),
                            t = e.find((e) => e.active),
                            n = e.find((e) => e.id === _),
                            r = [t, n, ...e].filter(Boolean),
                            o = r.map((e) => e.ref.current);
                          ed(o);
                        }
                      }
                      P.current = !1;
                    }),
                    onBlur: (0, l.M)(e.onBlur, () => R(!1)),
                  },
                ),
              ),
            )
          );
        }),
        ei = (0, a.forwardRef)((e, t) => {
          let {
              __scopeRovingFocusGroup: n,
              focusable: r = !0,
              active: u = !1,
              tabStopId: i,
              ...c
            } = e,
            s = (0, R.M)(),
            f = i || s,
            p = ea("RovingFocusGroupItem", n),
            v = p.currentTabStopId === f,
            m = ee(n),
            { onFocusableItemAdd: g, onFocusableItemRemove: h } = p;
          return (
            (0, a.useEffect)(() => {
              if (r) return g(), () => h();
            }, [r, g, h]),
            (0, a.createElement)(
              Q.ItemSlot,
              { scope: n, id: f, focusable: r, active: u },
              (0, a.createElement)(
                d.WV.span,
                (0, o.Z)(
                  { tabIndex: v ? 0 : -1, "data-orientation": p.orientation },
                  c,
                  {
                    ref: t,
                    onMouseDown: (0, l.M)(e.onMouseDown, (e) => {
                      r ? p.onItemFocus(f) : e.preventDefault();
                    }),
                    onFocus: (0, l.M)(e.onFocus, () => p.onItemFocus(f)),
                    onKeyDown: (0, l.M)(e.onKeyDown, (e) => {
                      if ("Tab" === e.key && e.shiftKey) {
                        p.onItemShiftTab();
                        return;
                      }
                      if (e.target !== e.currentTarget) return;
                      let t = (function (e, t, n) {
                        var r;
                        let o =
                          ((r = e.key),
                          "rtl" !== n
                            ? r
                            : "ArrowLeft" === r
                              ? "ArrowRight"
                              : "ArrowRight" === r
                                ? "ArrowLeft"
                                : r);
                        if (
                          !(
                            "vertical" === t &&
                            ["ArrowLeft", "ArrowRight"].includes(o)
                          ) &&
                          !(
                            "horizontal" === t &&
                            ["ArrowUp", "ArrowDown"].includes(o)
                          )
                        )
                          return ec[o];
                      })(e, p.orientation, p.dir);
                      if (void 0 !== t) {
                        e.preventDefault();
                        let o = m().filter((e) => e.focusable),
                          a = o.map((e) => e.ref.current);
                        if ("last" === t) a.reverse();
                        else if ("prev" === t || "next" === t) {
                          var n, r;
                          "prev" === t && a.reverse();
                          let o = a.indexOf(e.currentTarget);
                          a = p.loop
                            ? ((n = a),
                              (r = o + 1),
                              n.map((e, t) => n[(r + t) % n.length]))
                            : a.slice(o + 1);
                        }
                        setTimeout(() => ed(a));
                      }
                    }),
                  },
                ),
              ),
            )
          );
        }),
        ec = {
          ArrowLeft: "prev",
          ArrowUp: "prev",
          ArrowRight: "next",
          ArrowDown: "next",
          PageUp: "first",
          Home: "first",
          PageDown: "last",
          End: "last",
        };
      function ed(e) {
        let t = document.activeElement;
        for (let n of e)
          if (n === t || (n.focus(), document.activeElement !== t)) return;
      }
      var es = n(67256),
        ef = n(85859),
        ep = n(73386);
      let ev = ["Enter", " "],
        em = ["ArrowUp", "PageDown", "End"],
        eg = ["ArrowDown", "PageUp", "Home", ...em],
        eh = { ltr: [...ev, "ArrowRight"], rtl: [...ev, "ArrowLeft"] },
        ew = { ltr: ["ArrowLeft"], rtl: ["ArrowRight"] },
        eE = "Menu",
        [eb, ey, e_] = (0, s.B)(eE),
        [eM, eC] = (0, i.b)(eE, [e_, S, er]),
        eR = S(),
        eD = er(),
        [ex, eP] = eM(eE),
        [eO, eT] = eM(eE),
        ek = (0, a.forwardRef)((e, t) => {
          let { __scopeMenu: n, ...r } = e,
            l = eR(n);
          return (0, a.createElement)(Z, (0, o.Z)({}, l, r, { ref: t }));
        }),
        eI = "MenuPortal",
        [eF, eS] = eM(eI, { forceMount: void 0 }),
        eA = "MenuContent",
        [eL, eZ] = eM(eA),
        eW = (0, a.forwardRef)((e, t) => {
          let n = eS(eA, e.__scopeMenu),
            { forceMount: r = n.forceMount, ...l } = e,
            u = eP(eA, e.__scopeMenu),
            i = eT(eA, e.__scopeMenu);
          return (0, a.createElement)(
            eb.Provider,
            { scope: e.__scopeMenu },
            (0, a.createElement)(
              Y.z,
              { present: r || u.open },
              (0, a.createElement)(
                eb.Slot,
                { scope: e.__scopeMenu },
                i.modal
                  ? (0, a.createElement)(eK, (0, o.Z)({}, l, { ref: t }))
                  : (0, a.createElement)(eV, (0, o.Z)({}, l, { ref: t })),
              ),
            ),
          );
        }),
        eK = (0, a.forwardRef)((e, t) => {
          let n = eP(eA, e.__scopeMenu),
            r = (0, a.useRef)(null),
            i = (0, u.e)(t, r);
          return (
            (0, a.useEffect)(() => {
              let e = r.current;
              if (e) return (0, ef.Ry)(e);
            }, []),
            (0, a.createElement)(
              ez,
              (0, o.Z)({}, e, {
                ref: i,
                trapFocus: n.open,
                disableOutsidePointerEvents: n.open,
                disableOutsideScroll: !0,
                onFocusOutside: (0, l.M)(
                  e.onFocusOutside,
                  (e) => e.preventDefault(),
                  { checkForDefaultPrevented: !1 },
                ),
                onDismiss: () => n.onOpenChange(!1),
              }),
            )
          );
        }),
        eV = (0, a.forwardRef)((e, t) => {
          let n = eP(eA, e.__scopeMenu);
          return (0, a.createElement)(
            ez,
            (0, o.Z)({}, e, {
              ref: t,
              trapFocus: !1,
              disableOutsidePointerEvents: !1,
              disableOutsideScroll: !1,
              onDismiss: () => n.onOpenChange(!1),
            }),
          );
        }),
        ez = (0, a.forwardRef)((e, t) => {
          let {
              __scopeMenu: n,
              loop: r = !1,
              trapFocus: i,
              onOpenAutoFocus: c,
              onCloseAutoFocus: d,
              disableOutsidePointerEvents: s,
              onEntryFocus: f,
              onEscapeKeyDown: m,
              onPointerDownOutside: g,
              onFocusOutside: h,
              onInteractOutside: w,
              onDismiss: b,
              disableOutsideScroll: y,
              ..._
            } = e,
            M = eP(eA, n),
            C = eT(eA, n),
            R = eR(n),
            D = eD(n),
            x = ey(n),
            [P, O] = (0, a.useState)(null),
            T = (0, a.useRef)(null),
            k = (0, u.e)(t, T, M.onContentChange),
            I = (0, a.useRef)(0),
            F = (0, a.useRef)(""),
            S = (0, a.useRef)(0),
            A = (0, a.useRef)(null),
            L = (0, a.useRef)("right"),
            Z = (0, a.useRef)(0),
            W = y ? ep.Z : a.Fragment,
            K = y ? { as: es.g7, allowPinchZoom: !0 } : void 0,
            V = (e) => {
              var t, n;
              let r = F.current + e,
                o = x().filter((e) => !e.disabled),
                a = document.activeElement,
                l =
                  null === (t = o.find((e) => e.ref.current === a)) ||
                  void 0 === t
                    ? void 0
                    : t.textValue,
                u = o.map((e) => e.textValue),
                i = (function (e, t, n) {
                  var r;
                  let o =
                      t.length > 1 && Array.from(t).every((e) => e === t[0]),
                    a = o ? t[0] : t,
                    l = n ? e.indexOf(n) : -1,
                    u =
                      ((r = Math.max(l, 0)),
                      e.map((t, n) => e[(r + n) % e.length])),
                    i = 1 === a.length;
                  i && (u = u.filter((e) => e !== n));
                  let c = u.find((e) =>
                    e.toLowerCase().startsWith(a.toLowerCase()),
                  );
                  return c !== n ? c : void 0;
                })(u, r, l),
                c =
                  null === (n = o.find((e) => e.textValue === i)) ||
                  void 0 === n
                    ? void 0
                    : n.ref.current;
              !(function e(t) {
                (F.current = t),
                  window.clearTimeout(I.current),
                  "" !== t && (I.current = window.setTimeout(() => e(""), 1e3));
              })(r),
                c && setTimeout(() => c.focus());
            };
          (0, a.useEffect)(() => () => window.clearTimeout(I.current), []),
            (0, v.EW)();
          let B = (0, a.useCallback)((e) => {
            var t, n;
            let r =
              L.current ===
              (null === (t = A.current) || void 0 === t ? void 0 : t.side);
            return (
              r &&
              (function (e, t) {
                if (!t) return !1;
                let n = { x: e.clientX, y: e.clientY };
                return (function (e, t) {
                  let { x: n, y: r } = e,
                    o = !1;
                  for (let e = 0, a = t.length - 1; e < t.length; a = e++) {
                    let l = t[e].x,
                      u = t[e].y,
                      i = t[a].x,
                      c = t[a].y,
                      d =
                        u > r != c > r && n < ((i - l) * (r - u)) / (c - u) + l;
                    d && (o = !o);
                  }
                  return o;
                })(n, t);
              })(e, null === (n = A.current) || void 0 === n ? void 0 : n.area)
            );
          }, []);
          return (0, a.createElement)(
            eL,
            {
              scope: n,
              searchRef: F,
              onItemEnter: (0, a.useCallback)(
                (e) => {
                  B(e) && e.preventDefault();
                },
                [B],
              ),
              onItemLeave: (0, a.useCallback)(
                (e) => {
                  var t;
                  B(e) ||
                    (null === (t = T.current) || void 0 === t || t.focus(),
                    O(null));
                },
                [B],
              ),
              onTriggerLeave: (0, a.useCallback)(
                (e) => {
                  B(e) && e.preventDefault();
                },
                [B],
              ),
              pointerGraceTimerRef: S,
              onPointerGraceIntentChange: (0, a.useCallback)((e) => {
                A.current = e;
              }, []),
            },
            (0, a.createElement)(
              W,
              K,
              (0, a.createElement)(
                E,
                {
                  asChild: !0,
                  trapped: i,
                  onMountAutoFocus: (0, l.M)(c, (e) => {
                    var t;
                    e.preventDefault(),
                      null === (t = T.current) || void 0 === t || t.focus();
                  }),
                  onUnmountAutoFocus: d,
                },
                (0, a.createElement)(
                  p.XB,
                  {
                    asChild: !0,
                    disableOutsidePointerEvents: s,
                    onEscapeKeyDown: m,
                    onPointerDownOutside: g,
                    onFocusOutside: h,
                    onInteractOutside: w,
                    onDismiss: b,
                  },
                  (0, a.createElement)(
                    el,
                    (0, o.Z)({ asChild: !0 }, D, {
                      dir: C.dir,
                      orientation: "vertical",
                      loop: r,
                      currentTabStopId: P,
                      onCurrentTabStopIdChange: O,
                      onEntryFocus: (0, l.M)(f, (e) => {
                        C.isUsingKeyboardRef.current || e.preventDefault();
                      }),
                    }),
                    (0, a.createElement)(
                      z,
                      (0, o.Z)(
                        {
                          role: "menu",
                          "aria-orientation": "vertical",
                          "data-state": te(M.open),
                          "data-radix-menu-content": "",
                          dir: C.dir,
                        },
                        R,
                        _,
                        {
                          ref: k,
                          style: { outline: "none", ..._.style },
                          onKeyDown: (0, l.M)(_.onKeyDown, (e) => {
                            let t = e.target,
                              n =
                                t.closest("[data-radix-menu-content]") ===
                                e.currentTarget,
                              r = e.ctrlKey || e.altKey || e.metaKey,
                              o = 1 === e.key.length;
                            n &&
                              ("Tab" === e.key && e.preventDefault(),
                              !r && o && V(e.key));
                            let a = T.current;
                            if (e.target !== a || !eg.includes(e.key)) return;
                            e.preventDefault();
                            let l = x().filter((e) => !e.disabled),
                              u = l.map((e) => e.ref.current);
                            em.includes(e.key) && u.reverse(),
                              (function (e) {
                                let t = document.activeElement;
                                for (let n of e)
                                  if (
                                    n === t ||
                                    (n.focus(), document.activeElement !== t)
                                  )
                                    return;
                              })(u);
                          }),
                          onBlur: (0, l.M)(e.onBlur, (e) => {
                            e.currentTarget.contains(e.target) ||
                              (window.clearTimeout(I.current),
                              (F.current = ""));
                          }),
                          onPointerMove: (0, l.M)(
                            e.onPointerMove,
                            tr((e) => {
                              let t = e.target,
                                n = Z.current !== e.clientX;
                              if (e.currentTarget.contains(t) && n) {
                                let t =
                                  e.clientX > Z.current ? "right" : "left";
                                (L.current = t), (Z.current = e.clientX);
                              }
                            }),
                          ),
                        },
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
        eB = (0, a.forwardRef)((e, t) => {
          let { __scopeMenu: n, ...r } = e;
          return (0, a.createElement)(
            d.WV.div,
            (0, o.Z)({ role: "group" }, r, { ref: t }),
          );
        }),
        eG = (0, a.forwardRef)((e, t) => {
          let { __scopeMenu: n, ...r } = e;
          return (0, a.createElement)(d.WV.div, (0, o.Z)({}, r, { ref: t }));
        }),
        eN = "MenuItem",
        eU = "menu.itemSelect",
        e$ = (0, a.forwardRef)((e, t) => {
          let { disabled: n = !1, onSelect: r, ...i } = e,
            c = (0, a.useRef)(null),
            s = eT(eN, e.__scopeMenu),
            f = eZ(eN, e.__scopeMenu),
            p = (0, u.e)(t, c),
            v = (0, a.useRef)(!1);
          return (0, a.createElement)(
            eH,
            (0, o.Z)({}, i, {
              ref: p,
              disabled: n,
              onClick: (0, l.M)(e.onClick, () => {
                let e = c.current;
                if (!n && e) {
                  let t = new CustomEvent(eU, { bubbles: !0, cancelable: !0 });
                  e.addEventListener(eU, (e) => (null == r ? void 0 : r(e)), {
                    once: !0,
                  }),
                    (0, d.jH)(e, t),
                    t.defaultPrevented ? (v.current = !1) : s.onClose();
                }
              }),
              onPointerDown: (t) => {
                var n;
                null === (n = e.onPointerDown) || void 0 === n || n.call(e, t),
                  (v.current = !0);
              },
              onPointerUp: (0, l.M)(e.onPointerUp, (e) => {
                var t;
                v.current ||
                  null === (t = e.currentTarget) ||
                  void 0 === t ||
                  t.click();
              }),
              onKeyDown: (0, l.M)(e.onKeyDown, (e) => {
                let t = "" !== f.searchRef.current;
                !n &&
                  (!t || " " !== e.key) &&
                  ev.includes(e.key) &&
                  (e.currentTarget.click(), e.preventDefault());
              }),
            }),
          );
        }),
        eH = (0, a.forwardRef)((e, t) => {
          let { __scopeMenu: n, disabled: r = !1, textValue: i, ...c } = e,
            s = eZ(eN, n),
            f = eD(n),
            p = (0, a.useRef)(null),
            v = (0, u.e)(t, p),
            [m, g] = (0, a.useState)(!1),
            [h, w] = (0, a.useState)("");
          return (
            (0, a.useEffect)(() => {
              let e = p.current;
              if (e) {
                var t;
                w(
                  (null !== (t = e.textContent) && void 0 !== t
                    ? t
                    : ""
                  ).trim(),
                );
              }
            }, [c.children]),
            (0, a.createElement)(
              eb.ItemSlot,
              { scope: n, disabled: r, textValue: null != i ? i : h },
              (0, a.createElement)(
                ei,
                (0, o.Z)({ asChild: !0 }, f, { focusable: !r }),
                (0, a.createElement)(
                  d.WV.div,
                  (0, o.Z)(
                    {
                      role: "menuitem",
                      "data-highlighted": m ? "" : void 0,
                      "aria-disabled": r || void 0,
                      "data-disabled": r ? "" : void 0,
                    },
                    c,
                    {
                      ref: v,
                      onPointerMove: (0, l.M)(
                        e.onPointerMove,
                        tr((e) => {
                          if (r) s.onItemLeave(e);
                          else if ((s.onItemEnter(e), !e.defaultPrevented)) {
                            let t = e.currentTarget;
                            t.focus();
                          }
                        }),
                      ),
                      onPointerLeave: (0, l.M)(
                        e.onPointerLeave,
                        tr((e) => s.onItemLeave(e)),
                      ),
                      onFocus: (0, l.M)(e.onFocus, () => g(!0)),
                      onBlur: (0, l.M)(e.onBlur, () => g(!1)),
                    },
                  ),
                ),
              ),
            )
          );
        }),
        eX = (0, a.forwardRef)((e, t) => {
          let { checked: n = !1, onCheckedChange: r, ...u } = e;
          return (0, a.createElement)(
            e0,
            { scope: e.__scopeMenu, checked: n },
            (0, a.createElement)(
              e$,
              (0, o.Z)(
                {
                  role: "menuitemcheckbox",
                  "aria-checked": tt(n) ? "mixed" : n,
                },
                u,
                {
                  ref: t,
                  "data-state": tn(n),
                  onSelect: (0, l.M)(
                    u.onSelect,
                    () => (null == r ? void 0 : r(!!tt(n) || !n)),
                    { checkForDefaultPrevented: !1 },
                  ),
                },
              ),
            ),
          );
        }),
        [eY, ej] = eM("MenuRadioGroup", {
          value: void 0,
          onValueChange: () => {},
        }),
        eq = (0, a.forwardRef)((e, t) => {
          let { value: n, onValueChange: r, ...l } = e,
            u = (0, m.W)(r);
          return (0, a.createElement)(
            eY,
            { scope: e.__scopeMenu, value: n, onValueChange: u },
            (0, a.createElement)(eB, (0, o.Z)({}, l, { ref: t })),
          );
        }),
        eJ = (0, a.forwardRef)((e, t) => {
          let { value: n, ...r } = e,
            u = ej("MenuRadioItem", e.__scopeMenu),
            i = n === u.value;
          return (0, a.createElement)(
            e0,
            { scope: e.__scopeMenu, checked: i },
            (0, a.createElement)(
              e$,
              (0, o.Z)({ role: "menuitemradio", "aria-checked": i }, r, {
                ref: t,
                "data-state": tn(i),
                onSelect: (0, l.M)(
                  r.onSelect,
                  () => {
                    var e;
                    return null === (e = u.onValueChange) || void 0 === e
                      ? void 0
                      : e.call(u, n);
                  },
                  { checkForDefaultPrevented: !1 },
                ),
              }),
            ),
          );
        }),
        eQ = "MenuItemIndicator",
        [e0, e1] = eM(eQ, { checked: !1 }),
        e2 = (0, a.forwardRef)((e, t) => {
          let { __scopeMenu: n, forceMount: r, ...l } = e,
            u = e1(eQ, n);
          return (0, a.createElement)(
            Y.z,
            { present: r || tt(u.checked) || !0 === u.checked },
            (0, a.createElement)(
              d.WV.span,
              (0, o.Z)({}, l, { ref: t, "data-state": tn(u.checked) }),
            ),
          );
        }),
        e3 = (0, a.forwardRef)((e, t) => {
          let { __scopeMenu: n, ...r } = e;
          return (0, a.createElement)(
            d.WV.div,
            (0, o.Z)(
              { role: "separator", "aria-orientation": "horizontal" },
              r,
              { ref: t },
            ),
          );
        }),
        e5 =
          ((e, t) => {
            let { __scopeMenu: n, ...r } = e,
              l = eR(n);
            return (0, a.createElement)(G, (0, o.Z)({}, l, r, { ref: t }));
          },
          "MenuSub"),
        [e9, e7] = eM(e5),
        e4 = "MenuSubTrigger",
        e8 = (0, a.forwardRef)((e, t) => {
          let n = eP(e4, e.__scopeMenu),
            r = eT(e4, e.__scopeMenu),
            i = e7(e4, e.__scopeMenu),
            c = eZ(e4, e.__scopeMenu),
            d = (0, a.useRef)(null),
            { pointerGraceTimerRef: s, onPointerGraceIntentChange: f } = c,
            p = { __scopeMenu: e.__scopeMenu },
            v = (0, a.useCallback)(() => {
              d.current && window.clearTimeout(d.current), (d.current = null);
            }, []);
          return (
            (0, a.useEffect)(() => v, [v]),
            (0, a.useEffect)(() => {
              let e = s.current;
              return () => {
                window.clearTimeout(e), f(null);
              };
            }, [s, f]),
            (0, a.createElement)(
              ek,
              (0, o.Z)({ asChild: !0 }, p),
              (0, a.createElement)(
                eH,
                (0, o.Z)(
                  {
                    id: i.triggerId,
                    "aria-haspopup": "menu",
                    "aria-expanded": n.open,
                    "aria-controls": i.contentId,
                    "data-state": te(n.open),
                  },
                  e,
                  {
                    ref: (0, u.F)(t, i.onTriggerChange),
                    onClick: (t) => {
                      var r;
                      null === (r = e.onClick) || void 0 === r || r.call(e, t),
                        e.disabled ||
                          t.defaultPrevented ||
                          (t.currentTarget.focus(),
                          n.open || n.onOpenChange(!0));
                    },
                    onPointerMove: (0, l.M)(
                      e.onPointerMove,
                      tr((t) => {
                        c.onItemEnter(t),
                          t.defaultPrevented ||
                            e.disabled ||
                            n.open ||
                            d.current ||
                            (c.onPointerGraceIntentChange(null),
                            (d.current = window.setTimeout(() => {
                              n.onOpenChange(!0), v();
                            }, 100)));
                      }),
                    ),
                    onPointerLeave: (0, l.M)(
                      e.onPointerLeave,
                      tr((e) => {
                        var t, r;
                        v();
                        let o =
                          null === (t = n.content) || void 0 === t
                            ? void 0
                            : t.getBoundingClientRect();
                        if (o) {
                          let t =
                              null === (r = n.content) || void 0 === r
                                ? void 0
                                : r.dataset.side,
                            a = "right" === t,
                            l = o[a ? "left" : "right"],
                            u = o[a ? "right" : "left"];
                          c.onPointerGraceIntentChange({
                            area: [
                              { x: e.clientX + (a ? -5 : 5), y: e.clientY },
                              { x: l, y: o.top },
                              { x: u, y: o.top },
                              { x: u, y: o.bottom },
                              { x: l, y: o.bottom },
                            ],
                            side: t,
                          }),
                            window.clearTimeout(s.current),
                            (s.current = window.setTimeout(
                              () => c.onPointerGraceIntentChange(null),
                              300,
                            ));
                        } else {
                          if ((c.onTriggerLeave(e), e.defaultPrevented)) return;
                          c.onPointerGraceIntentChange(null);
                        }
                      }),
                    ),
                    onKeyDown: (0, l.M)(e.onKeyDown, (t) => {
                      let o = "" !== c.searchRef.current;
                      if (
                        !e.disabled &&
                        (!o || " " !== t.key) &&
                        eh[r.dir].includes(t.key)
                      ) {
                        var a;
                        n.onOpenChange(!0),
                          null === (a = n.content) || void 0 === a || a.focus(),
                          t.preventDefault();
                      }
                    }),
                  },
                ),
              ),
            )
          );
        }),
        e6 = (0, a.forwardRef)((e, t) => {
          let n = eS(eA, e.__scopeMenu),
            { forceMount: r = n.forceMount, ...i } = e,
            c = eP(eA, e.__scopeMenu),
            d = eT(eA, e.__scopeMenu),
            s = e7("MenuSubContent", e.__scopeMenu),
            f = (0, a.useRef)(null),
            p = (0, u.e)(t, f);
          return (0, a.createElement)(
            eb.Provider,
            { scope: e.__scopeMenu },
            (0, a.createElement)(
              Y.z,
              { present: r || c.open },
              (0, a.createElement)(
                eb.Slot,
                { scope: e.__scopeMenu },
                (0, a.createElement)(
                  ez,
                  (0, o.Z)(
                    { id: s.contentId, "aria-labelledby": s.triggerId },
                    i,
                    {
                      ref: p,
                      align: "start",
                      side: "rtl" === d.dir ? "left" : "right",
                      disableOutsidePointerEvents: !1,
                      disableOutsideScroll: !1,
                      trapFocus: !1,
                      onOpenAutoFocus: (e) => {
                        var t;
                        d.isUsingKeyboardRef.current &&
                          (null === (t = f.current) ||
                            void 0 === t ||
                            t.focus()),
                          e.preventDefault();
                      },
                      onCloseAutoFocus: (e) => e.preventDefault(),
                      onFocusOutside: (0, l.M)(e.onFocusOutside, (e) => {
                        e.target !== s.trigger && c.onOpenChange(!1);
                      }),
                      onEscapeKeyDown: (0, l.M)(e.onEscapeKeyDown, (e) => {
                        d.onClose(), e.preventDefault();
                      }),
                      onKeyDown: (0, l.M)(e.onKeyDown, (e) => {
                        let t = e.currentTarget.contains(e.target),
                          n = ew[d.dir].includes(e.key);
                        if (t && n) {
                          var r;
                          c.onOpenChange(!1),
                            null === (r = s.trigger) ||
                              void 0 === r ||
                              r.focus(),
                            e.preventDefault();
                        }
                      }),
                    },
                  ),
                ),
              ),
            ),
          );
        });
      function te(e) {
        return e ? "open" : "closed";
      }
      function tt(e) {
        return "indeterminate" === e;
      }
      function tn(e) {
        return tt(e) ? "indeterminate" : e ? "checked" : "unchecked";
      }
      function tr(e) {
        return (t) => ("mouse" === t.pointerType ? e(t) : void 0);
      }
      let to = (e) => {
          let {
              __scopeMenu: t,
              open: n = !1,
              children: r,
              dir: o,
              onOpenChange: l,
              modal: u = !0,
            } = e,
            i = eR(t),
            [c, d] = (0, a.useState)(null),
            s = (0, a.useRef)(!1),
            p = (0, m.W)(l),
            v = (0, f.gm)(o);
          return (
            (0, a.useEffect)(() => {
              let e = () => {
                  (s.current = !0),
                    document.addEventListener("pointerdown", t, {
                      capture: !0,
                      once: !0,
                    }),
                    document.addEventListener("pointermove", t, {
                      capture: !0,
                      once: !0,
                    });
                },
                t = () => (s.current = !1);
              return (
                document.addEventListener("keydown", e, { capture: !0 }),
                () => {
                  document.removeEventListener("keydown", e, { capture: !0 }),
                    document.removeEventListener("pointerdown", t, {
                      capture: !0,
                    }),
                    document.removeEventListener("pointermove", t, {
                      capture: !0,
                    });
                }
              );
            }, []),
            (0, a.createElement)(
              H,
              i,
              (0, a.createElement)(
                ex,
                {
                  scope: t,
                  open: n,
                  onOpenChange: p,
                  content: c,
                  onContentChange: d,
                },
                (0, a.createElement)(
                  eO,
                  {
                    scope: t,
                    onClose: (0, a.useCallback)(() => p(!1), [p]),
                    isUsingKeyboardRef: s,
                    dir: v,
                    modal: u,
                  },
                  r,
                ),
              ),
            )
          );
        },
        ta = (e) => {
          let { __scopeMenu: t, forceMount: n, children: r, container: o } = e,
            l = eP(eI, t);
          return (0, a.createElement)(
            eF,
            { scope: t, forceMount: n },
            (0, a.createElement)(
              Y.z,
              { present: n || l.open },
              (0, a.createElement)(X.h, { asChild: !0, container: o }, r),
            ),
          );
        },
        tl = (e) => {
          let {
              __scopeMenu: t,
              children: n,
              open: r = !1,
              onOpenChange: o,
            } = e,
            l = eP(e5, t),
            u = eR(t),
            [i, c] = (0, a.useState)(null),
            [d, s] = (0, a.useState)(null),
            f = (0, m.W)(o);
          return (
            (0, a.useEffect)(
              () => (!1 === l.open && f(!1), () => f(!1)),
              [l.open, f],
            ),
            (0, a.createElement)(
              H,
              u,
              (0, a.createElement)(
                ex,
                {
                  scope: t,
                  open: r,
                  onOpenChange: f,
                  content: d,
                  onContentChange: s,
                },
                (0, a.createElement)(
                  e9,
                  {
                    scope: t,
                    contentId: (0, R.M)(),
                    triggerId: (0, R.M)(),
                    trigger: i,
                    onTriggerChange: c,
                  },
                  n,
                ),
              ),
            )
          );
        },
        tu = "DropdownMenu",
        [ti, tc] = (0, i.b)(tu, [eC]),
        td = eC(),
        [ts, tf] = ti(tu),
        tp = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, disabled: r = !1, ...i } = e,
            c = tf("DropdownMenuTrigger", n),
            s = td(n);
          return (0, a.createElement)(
            ek,
            (0, o.Z)({ asChild: !0 }, s),
            (0, a.createElement)(
              d.WV.button,
              (0, o.Z)(
                {
                  type: "button",
                  id: c.triggerId,
                  "aria-haspopup": "menu",
                  "aria-expanded": c.open,
                  "aria-controls": c.open ? c.contentId : void 0,
                  "data-state": c.open ? "open" : "closed",
                  "data-disabled": r ? "" : void 0,
                  disabled: r,
                },
                i,
                {
                  ref: (0, u.F)(t, c.triggerRef),
                  onPointerDown: (0, l.M)(e.onPointerDown, (e) => {
                    r ||
                      0 !== e.button ||
                      !1 !== e.ctrlKey ||
                      (c.onOpenToggle(), c.open || e.preventDefault());
                  }),
                  onKeyDown: (0, l.M)(e.onKeyDown, (e) => {
                    !r &&
                      (["Enter", " "].includes(e.key) && c.onOpenToggle(),
                      "ArrowDown" === e.key && c.onOpenChange(!0),
                      ["Enter", " ", "ArrowDown"].includes(e.key) &&
                        e.preventDefault());
                  }),
                },
              ),
            ),
          );
        }),
        tv = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            u = tf("DropdownMenuContent", n),
            i = td(n),
            c = (0, a.useRef)(!1);
          return (0, a.createElement)(
            eW,
            (0, o.Z)(
              { id: u.contentId, "aria-labelledby": u.triggerId },
              i,
              r,
              {
                ref: t,
                onCloseAutoFocus: (0, l.M)(e.onCloseAutoFocus, (e) => {
                  var t;
                  c.current ||
                    null === (t = u.triggerRef.current) ||
                    void 0 === t ||
                    t.focus(),
                    (c.current = !1),
                    e.preventDefault();
                }),
                onInteractOutside: (0, l.M)(e.onInteractOutside, (e) => {
                  let t = e.detail.originalEvent,
                    n = 0 === t.button && !0 === t.ctrlKey,
                    r = 2 === t.button || n;
                  (!u.modal || r) && (c.current = !0);
                }),
                style: {
                  ...e.style,
                  "--radix-dropdown-menu-content-transform-origin":
                    "var(--radix-popper-transform-origin)",
                  "--radix-dropdown-menu-content-available-width":
                    "var(--radix-popper-available-width)",
                  "--radix-dropdown-menu-content-available-height":
                    "var(--radix-popper-available-height)",
                  "--radix-dropdown-menu-trigger-width":
                    "var(--radix-popper-anchor-width)",
                  "--radix-dropdown-menu-trigger-height":
                    "var(--radix-popper-anchor-height)",
                },
              },
            ),
          );
        }),
        tm = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(eB, (0, o.Z)({}, l, r, { ref: t }));
        }),
        tg = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(eG, (0, o.Z)({}, l, r, { ref: t }));
        }),
        th = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(e$, (0, o.Z)({}, l, r, { ref: t }));
        }),
        tw = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(eX, (0, o.Z)({}, l, r, { ref: t }));
        }),
        tE = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(eq, (0, o.Z)({}, l, r, { ref: t }));
        }),
        tb = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(eJ, (0, o.Z)({}, l, r, { ref: t }));
        }),
        ty = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(e2, (0, o.Z)({}, l, r, { ref: t }));
        }),
        t_ = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(e3, (0, o.Z)({}, l, r, { ref: t }));
        }),
        tM = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(e8, (0, o.Z)({}, l, r, { ref: t }));
        }),
        tC = (0, a.forwardRef)((e, t) => {
          let { __scopeDropdownMenu: n, ...r } = e,
            l = td(n);
          return (0, a.createElement)(
            e6,
            (0, o.Z)({}, l, r, {
              ref: t,
              style: {
                ...e.style,
                "--radix-dropdown-menu-content-transform-origin":
                  "var(--radix-popper-transform-origin)",
                "--radix-dropdown-menu-content-available-width":
                  "var(--radix-popper-available-width)",
                "--radix-dropdown-menu-content-available-height":
                  "var(--radix-popper-available-height)",
                "--radix-dropdown-menu-trigger-width":
                  "var(--radix-popper-anchor-width)",
                "--radix-dropdown-menu-trigger-height":
                  "var(--radix-popper-anchor-height)",
              },
            }),
          );
        }),
        tR = (e) => {
          let {
              __scopeDropdownMenu: t,
              children: n,
              dir: r,
              open: l,
              defaultOpen: u,
              onOpenChange: i,
              modal: d = !0,
            } = e,
            s = td(t),
            f = (0, a.useRef)(null),
            [p = !1, v] = (0, c.T)({ prop: l, defaultProp: u, onChange: i });
          return (0, a.createElement)(
            ts,
            {
              scope: t,
              triggerId: (0, R.M)(),
              triggerRef: f,
              contentId: (0, R.M)(),
              open: p,
              onOpenChange: v,
              onOpenToggle: (0, a.useCallback)(() => v((e) => !e), [v]),
              modal: d,
            },
            (0, a.createElement)(
              to,
              (0, o.Z)({}, s, { open: p, onOpenChange: v, dir: r, modal: d }),
              n,
            ),
          );
        },
        tD = tp,
        tx = (e) => {
          let { __scopeDropdownMenu: t, ...n } = e,
            r = td(t);
          return (0, a.createElement)(ta, (0, o.Z)({}, r, n));
        },
        tP = tv,
        tO = tm,
        tT = tg,
        tk = th,
        tI = tw,
        tF = tE,
        tS = tb,
        tA = ty,
        tL = t_,
        tZ = (e) => {
          let {
              __scopeDropdownMenu: t,
              children: n,
              open: r,
              onOpenChange: l,
              defaultOpen: u,
            } = e,
            i = td(t),
            [d = !1, s] = (0, c.T)({ prop: r, defaultProp: u, onChange: l });
          return (0, a.createElement)(
            tl,
            (0, o.Z)({}, i, { open: d, onOpenChange: s }),
            n,
          );
        },
        tW = tM,
        tK = tC;
    },
    52730: function (e, t, n) {
      "use strict";
      n.d(t, {
        h: function () {
          return u;
        },
      });
      var r = n(13428),
        o = n(2265),
        a = n(54887),
        l = n(9381);
      let u = (0, o.forwardRef)((e, t) => {
        var n;
        let {
          container: u = null == globalThis
            ? void 0
            : null === (n = globalThis.document) || void 0 === n
              ? void 0
              : n.body,
          ...i
        } = e;
        return u
          ? a.createPortal(
              (0, o.createElement)(l.WV.div, (0, r.Z)({}, i, { ref: t })),
              u,
            )
          : null;
      });
    },
  },
]);
