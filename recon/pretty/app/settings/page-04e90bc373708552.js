(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [6938],
  {
    23575: function (e, r, t) {
      Promise.resolve().then(t.bind(t, 29481));
    },
    29481: function (e, r, t) {
      "use strict";
      t.r(r),
        t.d(r, {
          default: function () {
            return m;
          },
        });
      var a = t(57437),
        s = t(93378),
        n = t(71616),
        o = t(22048),
        i = t(75644),
        l = t(18962),
        d = t(35254),
        c = t(26058),
        u = t(2265);
      function m() {
        var e;
        let [r, t] = (0, u.useState)(null),
          [m, x] = (0, u.useState)(null),
          { userLogged: f } = (0, l.a)(),
          { changeCompany: h } = (0, d.a)();
        return (
          (0, u.useEffect)(() => {
            (async () => {
              try {
                let { data: e } = await (0, c.j_)();
                x(e);
              } catch (e) {
                console.error(
                  "Erro ao tentar obter as empresa com retorno basico: ",
                  e,
                );
              }
            })();
          }, []),
          (0, a.jsxs)("div", {
            className: "px-6 pb-10 ml-56 h-fit flex flex-col gap-2",
            children: [
              (0, a.jsxs)("section", {
                className: "flex flex-col gap-6",
                children: [
                  (0, a.jsx)("h3", {
                    className: "font-semibold text-neutral-03 text-xl",
                    children: "Redefini\xe7\xe3o de senha",
                  }),
                  (0, a.jsx)(i.Z, {}),
                ],
              }),
              (0, a.jsx)(o.Separator, { className: "ml-16 w-[60%] my-8 h-1" }),
              ((null == f ? void 0 : f.role) === "CONSULTOR" ||
                (null == f ? void 0 : f.role) === "AUDITOR") &&
                (0, a.jsxs)("section", {
                  children: [
                    (0, a.jsxs)("h3", {
                      className: "font-semibold text-neutral-03 text-xl",
                      children: ["Mudar empresa relacionada", " "],
                    }),
                    (0, a.jsxs)("div", {
                      className: "flex flex-col gap-1 my-3",
                      children: [
                        (0, a.jsx)("span", {
                          className: "text-base text-neutral font-semibold",
                          children: "Empresa atual:",
                        }),
                        (0, a.jsx)("span", {
                          className: "text-base text-neutral-03 font-medium",
                          children:
                            null == f
                              ? void 0
                              : null === (e = f.company) || void 0 === e
                                ? void 0
                                : e.bussinessName,
                        }),
                      ],
                    }),
                    (0, a.jsx)("div", {
                      className: "w-[70%]",
                      children: (0, a.jsx)(n.Z, {
                        changeSelect: (e) => {
                          let r =
                            null == m ? void 0 : m.find((r) => r.id === e);
                          r && t(r);
                        },
                        data: m,
                      }),
                    }),
                    (0, a.jsxs)("div", {
                      className: "space-y-3 mt-14 mb-40",
                      children: [
                        (0, a.jsx)("h4", {
                          className: "font-semibold text-neutral text-base",
                          children: "Empresa selecionada:",
                        }),
                        r
                          ? (0, a.jsxs)(
                              "div",
                              {
                                className:
                                  "w-fit h-12 px-4 flex gap-2 justify-between items-center bg-white rounded-2xl shadow-md",
                                children: [
                                  (0, a.jsx)("span", {
                                    className:
                                      "font-medium text-base text-neutral-04",
                                    children: r.bussinessName,
                                  }),
                                  (0, a.jsx)(s.z, {
                                    className:
                                      "border-none bg-transparent shadow-transparent hover:bg-transparent text-black rounded-lg p-1",
                                    type: "button",
                                    onClick: () => t(null),
                                    children: "x",
                                  }),
                                ],
                              },
                              r.id,
                            )
                          : (0, a.jsx)("span", {
                              className: "text-neutral-03",
                              children: "Nenhuma empresa selecionada.",
                            }),
                      ],
                    }),
                    (0, a.jsx)("div", {
                      className: "w-[70%] flex justify-center",
                      children: (0, a.jsx)(s.z, {
                        size: "lg",
                        className: "w-[390px]",
                        variant: "success",
                        onClick: () => h(f.id, null == r ? void 0 : r.id),
                        children: "SALVAR ALTERA\xc7\xd5ES",
                      }),
                    }),
                  ],
                }),
            ],
          })
        );
      }
    },
    93378: function (e, r, t) {
      "use strict";
      t.d(r, {
        z: function () {
          return d;
        },
      });
      var a = t(57437),
        s = t(2265),
        n = t(67256),
        o = t(96061),
        i = t(22703);
      let l = (0, o.j)(
          "inline-flex items-center justify-center rounded-md text-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-neutral-02 disabled:text-neutral-01 ",
          {
            variants: {
              variant: {
                default:
                  "bg-primary-03 text-white shadow hover:bg-primary-03/90",
                "primary-02":
                  "bg-primary-02 text-white shadow hover:bg-primary-02/90",
                "primary-main":
                  "bg-primary-main text-white hover:bg-primary-main/90",
                secondary:
                  "bg-secondary-02 text-white shadow-sm hover:bg-secondary-03",
                neutral:
                  "bg-neutral-02 text-neutral hover:text-white hover:bg-neutral-03",
                "neutral-02":
                  "bg-neutral-03 text-neutral-01 hover:bg-neutral-03/90",
                error:
                  "bg-semantic-error text-white shadow-sm hover:bg-[#FF301CB2]",
                alert: "text-neutral bg-semantic-alert hover:bg-[#CA9715]",
                success:
                  "bg-semantic-success text-neutral shadow-sm hover:bg-secondary-02",
                "success-2":
                  "bg-semantic-success-2 text-white shadow-sm hover:bg-semantic-success-2",
                link: "text-neutral bg-semantic-link hover:bg-[#18D3DE]",
                outline:
                  "border border-primary-03 text-primary-03 bg-transparent shadow-sm hover:bg-primary-03 hover:text-white",
                "outline-white":
                  "border border-white text-white bg-transparent shadow-sm hover:bg-white hover:text-primary-03",
                "outline-02":
                  "border border-neutral-01 text-primary-03 bg-neutral-01 shadow-sm hover:bg-primary-03 hover:text-white hover:border-primary-03",
                "outline-03":
                  "text-[#0E3A68] bg-white border-solid border-2 border-[#759EE7] disabled:border-[0px]",
                ghost: "hover:bg-transparent hover:text-neutral",
                "card-answer":
                  "bg-black text-white shadow-md hover:bg-black/90",
                "dark-blue":
                  "bg-[#0E3A68] text-white shadow-sm hover:bg-[#0b335f]",
              },
              size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-11 rounded-md px-8",
                icon: "h-9 w-9",
                free: "",
              },
            },
            defaultVariants: { variant: "default", size: "default" },
          },
        ),
        d = s.forwardRef((e, r) => {
          let { className: t, variant: s, size: o, asChild: d = !1, ...c } = e,
            u = d ? n.g7 : "button";
          return (0, a.jsx)(u, {
            className: (0, i.cn)(l({ variant: s, size: o, className: t })),
            ref: r,
            ...c,
          });
        });
      d.displayName = "Button";
    },
    64992: function (e, r, t) {
      "use strict";
      t.d(r, {
        NI: function () {
          return p;
        },
        Wi: function () {
          return u;
        },
        l0: function () {
          return d;
        },
        lX: function () {
          return h;
        },
        xJ: function () {
          return f;
        },
        zG: function () {
          return v;
        },
      });
      var a = t(57437),
        s = t(2265),
        n = t(67256),
        o = t(61865),
        i = t(22703),
        l = t(58020);
      let d = o.RV,
        c = s.createContext({}),
        u = (e) => {
          let { ...r } = e;
          return (0, a.jsx)(c.Provider, {
            value: { name: r.name },
            children: (0, a.jsx)(o.Qr, { ...r }),
          });
        },
        m = () => {
          let e = s.useContext(c),
            r = s.useContext(x),
            { getFieldState: t, formState: a } = (0, o.Gc)(),
            n = t(e.name, a);
          if (!e) throw Error("useFormField should be used within <FormField>");
          let { id: i } = r;
          return {
            id: i,
            name: e.name,
            formItemId: "".concat(i, "-form-item"),
            formDescriptionId: "".concat(i, "-form-item-description"),
            formMessageId: "".concat(i, "-form-item-message"),
            ...n,
          };
        },
        x = s.createContext({}),
        f = s.forwardRef((e, r) => {
          let { className: t, ...n } = e,
            o = s.useId();
          return (0, a.jsx)(x.Provider, {
            value: { id: o },
            children: (0, a.jsx)("div", {
              ref: r,
              className: (0, i.cn)("space-y-2 relative", t),
              ...n,
            }),
          });
        });
      f.displayName = "FormItem";
      let h = s.forwardRef((e, r) => {
        let { className: t, ...s } = e,
          { error: n, formItemId: o } = m();
        return (0, a.jsx)(l._, {
          ref: r,
          className: (0, i.cn)(
            n &&
              "text-destructive body-m transition-colors ease-in-out duration-100",
            t,
          ),
          htmlFor: o,
          ...s,
        });
      });
      h.displayName = "FormLabel";
      let p = s.forwardRef((e, r) => {
        let { ...t } = e,
          {
            error: s,
            formItemId: o,
            formDescriptionId: i,
            formMessageId: l,
          } = m();
        return (0, a.jsx)(n.g7, {
          ref: r,
          id: o,
          "aria-describedby": s ? "".concat(i, " ").concat(l) : "".concat(i),
          "aria-invalid": !!s,
          ...t,
        });
      });
      p.displayName = "FormControl";
      let b = s.forwardRef((e, r) => {
        let { className: t, ...s } = e,
          { formDescriptionId: n } = m();
        return (0, a.jsx)("p", {
          ref: r,
          id: n,
          className: (0, i.cn)("text-[0.8rem] text-muted-foreground", t),
          ...s,
        });
      });
      b.displayName = "FormDescription";
      let v = s.forwardRef((e, r) => {
        let { className: t, children: s, ...n } = e,
          { error: o, formMessageId: l } = m(),
          d = o ? String(null == o ? void 0 : o.message) : s;
        return d
          ? (0, a.jsx)("p", {
              ref: r,
              id: l,
              className: (0, i.cn)(
                "text-[0.8rem] font-medium text-destructive absolute -bottom-4 text-xs text-rose-600",
                t,
              ),
              ...n,
              children: "Required" === d ? "Obrigat\xf3rio" : d,
            })
          : null;
      });
      v.displayName = "FormMessage";
    },
    93695: function (e, r, t) {
      "use strict";
      t.d(r, {
        I: function () {
          return o;
        },
      });
      var a = t(57437),
        s = t(2265),
        n = t(22703);
      let o = s.forwardRef((e, r) => {
        let { className: t, type: s, ...o } = e;
        return (0, a.jsx)("input", {
          type: s,
          className: (0, n.cn)(
            "appearance-none flex h-12 w-full rounded-md border border-input bg-transparent py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 peer input-base body-s  ease-in-out  duration-500 hover:bg-gray-200 px-4 border-gray-200 hover:border-gray-200 outline-none focus:border-primary focus:text-primary focus:bg-white",
            t,
          ),
          ref: r,
          ...o,
        });
      });
      o.displayName = "Input";
    },
    58020: function (e, r, t) {
      "use strict";
      t.d(r, {
        _: function () {
          return d;
        },
      });
      var a = t(57437),
        s = t(2265),
        n = t(36743),
        o = t(96061),
        i = t(22703);
      let l = (0, o.j)(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        ),
        d = s.forwardRef((e, r) => {
          let { className: t, ...s } = e;
          return (0, a.jsx)(n.f, {
            ref: r,
            className: (0, i.cn)(l(), t),
            ...s,
          });
        });
      d.displayName = n.f.displayName;
    },
    71616: function (e, r, t) {
      "use strict";
      var a = t(57437),
        s = t(2265),
        n = t(88920);
      r.Z = (e) => {
        let { changeSelect: r, data: t } = e,
          [o, i] = (0, s.useState)([]),
          [l, d] = (0, s.useState)(!1),
          c = (e) => {
            if ((l || d(!0), e.length <= 0)) i([]), d(!1);
            else {
              let r = t.filter((r) =>
                r.bussinessName.toLowerCase().includes(e.toLowerCase()),
              );
              i([...r]);
            }
          },
          u = (0, s.useRef)(null),
          m = (0, s.useRef)(null);
        return (
          (0, s.useEffect)(() => {
            let e = (e) => {
              m.current && e.target && (m.current.contains(e.target) || d(!1));
            };
            return (
              window.addEventListener("mousedown", e),
              () => {
                document.documentElement.classList.remove("overflow-hidden"),
                  window.removeEventListener("mousedown", e);
              }
            );
          }, []),
          (0, a.jsxs)("div", {
            className: "flex flex-col relative",
            children: [
              (0, a.jsxs)("div", {
                className:
                  "flex items-center gap-2 w-full h-14 rounded-lg border-1 px-4 bg-neutral-01 shadow-sm",
                children: [
                  (0, a.jsx)("button", {
                    onClick: () => {
                      var e;
                      return c(
                        null === (e = u.current) || void 0 === e
                          ? void 0
                          : e.value,
                      );
                    },
                    children: (0, a.jsx)(n.jRj, {
                      size: "1.25rem",
                      className: "stroke-neutral-03",
                    }),
                  }),
                  (0, a.jsx)("input", {
                    ref: u,
                    type: "text",
                    name: "search",
                    id: "search",
                    placeholder: "Pesquisar empresa",
                    className: "outline-none w-full bg-transparent",
                    onChange: (e) => c(e.target.value),
                  }),
                ],
              }),
              l &&
                (0, a.jsx)("div", {
                  className:
                    "flex flex-col w-full overflow-y-auto max-h-[170px] absolute top-14 ".concat(
                      l && "shadow-md",
                    ),
                  ref: m,
                  children: o.map((e) =>
                    (0, a.jsx)(
                      "button",
                      {
                        className:
                          "bg p-4 rounded border-[1px] border-neutral-02 hover:bg-neutral-01 text-start bg-white",
                        onClick: () => (r(e.id), d(!1)),
                        children: e.bussinessName,
                      },
                      e.id,
                    ),
                  ),
                }),
            ],
          })
        );
      };
    },
    22048: function (e, r, t) {
      "use strict";
      t.r(r),
        t.d(r, {
          Separator: function () {
            return i;
          },
        });
      var a = t(57437),
        s = t(2265),
        n = t(26823),
        o = t(22703);
      let i = s.forwardRef((e, r) => {
        let {
          className: t,
          orientation: s = "horizontal",
          decorative: i = !0,
          ...l
        } = e;
        return (0, a.jsx)(n.f, {
          ref: r,
          decorative: i,
          orientation: s,
          className: (0, o.cn)(
            "shrink-0 bg-border",
            "horizontal" === s ? "h-[1px] w-full" : "h-full w-[1px]",
            t,
          ),
          ...l,
        });
      });
      i.displayName = n.f.displayName;
    },
    75644: function (e, r, t) {
      "use strict";
      var a = t(57437),
        s = t(93378),
        n = t(64992),
        o = t(93695),
        i = t(66501),
        l = t(27470),
        d = t(89384),
        c = t(38110),
        u = t(2265),
        m = t(61865),
        x = t(19241);
      r.Z = () => {
        let [e, r] = (0, u.useState)("password"),
          [t, f] = (0, u.useState)("password"),
          h = (0, m.cI)({ resolver: (0, c.F)(i.J) }),
          p = async (e) => {
            if (!e.password || e.password.length <= 4) {
              (0, d.h)("Passe uma senha valida.", "error");
              return;
            }
            let r = await (0, l.Cp)({ password: e.password });
            if (200 === r.status)
              return (0, d.h)("Sucesso, senha alterada!", "success");
            (0, d.h)(
              "Erro interno, tente novamento ou contate o suporte",
              "error",
            );
          };
        return (0, a.jsx)(n.l0, {
          ...h,
          children: (0, a.jsxs)("form", {
            onSubmit: h.handleSubmit(p),
            className: "w-[70%] flex flex-col gap-6",
            noValidate: !0,
            autoComplete: "off",
            children: [
              (0, a.jsxs)("div", {
                className: "relative",
                children: [
                  (0, a.jsx)(n.Wi, {
                    name: "password",
                    control: h.control,
                    render: (r) => {
                      let { field: t } = r;
                      return (0, a.jsxs)(n.xJ, {
                        className:
                          "group/fieldset relative flex flex-col-reverse gap-1 mb-1",
                        children: [
                          (0, a.jsx)(n.NI, {
                            children: (0, a.jsxs)(a.Fragment, {
                              children: [
                                (0, a.jsx)(o.I, {
                                  placeholder: "Digite sua nova senha",
                                  ...t,
                                  type: e,
                                }),
                                (0, a.jsx)(n.lX, {
                                  className:
                                    "input-label-float -top-4 left-2 text-xs",
                                  children: "Nova senha",
                                }),
                              ],
                            }),
                          }),
                          (0, a.jsx)(n.zG, {}),
                        ],
                      });
                    },
                  }),
                  (0, a.jsx)("button", {
                    type: "button",
                    onClick: () =>
                      "password" === e ? r("text") : r("password"),
                    className: "absolute right-3 top-4",
                    children:
                      "password" === e
                        ? (0, a.jsx)(x.NuV, { className: "fill-blue-500" })
                        : (0, a.jsx)(x.L29, { className: "fill-blue-500" }),
                  }),
                ],
              }),
              (0, a.jsxs)("div", {
                className: "relative",
                children: [
                  (0, a.jsx)(n.Wi, {
                    name: "confirmPassword",
                    control: h.control,
                    render: (e) => {
                      let { field: r } = e;
                      return (0, a.jsxs)(n.xJ, {
                        className:
                          "group/fieldset relative flex flex-col-reverse gap-1 mb-1",
                        children: [
                          (0, a.jsx)(n.NI, {
                            children: (0, a.jsxs)(a.Fragment, {
                              children: [
                                (0, a.jsx)(o.I, {
                                  placeholder: "Confirme sua senha",
                                  ...r,
                                  type: t,
                                }),
                                (0, a.jsx)(n.lX, {
                                  className:
                                    "input-label-float -top-4 left-2 text-xs",
                                  children: "Confirme sua nova senha",
                                }),
                              ],
                            }),
                          }),
                          (0, a.jsx)(n.zG, {}),
                        ],
                      });
                    },
                  }),
                  (0, a.jsx)("button", {
                    type: "button",
                    onClick: () =>
                      "password" === t ? f("text") : f("password"),
                    className: "absolute right-3 top-4",
                    children:
                      "password" === t
                        ? (0, a.jsx)(x.NuV, { className: "fill-blue-500" })
                        : (0, a.jsx)(x.L29, { className: "fill-blue-500" }),
                  }),
                ],
              }),
              (0, a.jsx)(s.z, { size: "lg", children: "salvar nova senha" }),
            ],
          }),
        });
      };
    },
    35254: function (e, r, t) {
      "use strict";
      t.d(r, {
        a: function () {
          return n;
        },
      });
      var a = t(81388),
        s = t(2265);
      let n = () => (0, s.useContext)(a.S);
    },
    22703: function (e, r, t) {
      "use strict";
      t.d(r, {
        cn: function () {
          return n;
        },
      });
      var a = t(57042),
        s = t(23986);
      function n() {
        for (var e = arguments.length, r = Array(e), t = 0; t < e; t++)
          r[t] = arguments[t];
        return (0, s.m)((0, a.W)(r));
      }
    },
    66501: function (e, r, t) {
      "use strict";
      t.d(r, {
        J: function () {
          return n;
        },
        d: function () {
          return s;
        },
      });
      var a = t(74578);
      let s = a.z.object({
          email: a.z
            .string({ required_error: "*O campo e-mail \xe9 obrigat\xf3rio" })
            .email({ message: "*O campo e-mail deve ser um e-mail v\xe1lido" }),
          password: a.z.string({
            required_error: "*O campo senha \xe9 obrigat\xf3ria",
          }),
        }),
        n = a.z
          .object({
            password: a.z
              .string({ required_error: "*O campo senha \xe9 obrigat\xf3rio" })
              .min(4, {
                message: "*O campo deve ter no min\xedmo 4 caracteres",
              })
              .optional(),
            confirmPassword: a.z
              .string({ required_error: "*O campo senha \xe9 obrigat\xf3rio" })
              .min(4, {
                message: "*O campo deve ter no min\xedmo 4 caracteres",
              })
              .optional(),
          })
          .refine((e) => e.password === e.confirmPassword, {
            message: "As senhas n\xe3o correspondem",
            path: ["confirmPassword"],
          });
    },
    26823: function (e, r, t) {
      "use strict";
      t.d(r, {
        f: function () {
          return c;
        },
      });
      var a = t(13428),
        s = t(2265),
        n = t(9381);
      let o = "horizontal",
        i = ["horizontal", "vertical"],
        l = (0, s.forwardRef)((e, r) => {
          let { decorative: t, orientation: i = o, ...l } = e,
            c = d(i) ? i : o;
          return (0, s.createElement)(
            n.WV.div,
            (0, a.Z)(
              { "data-orientation": c },
              t
                ? { role: "none" }
                : {
                    "aria-orientation": "vertical" === c ? c : void 0,
                    role: "separator",
                  },
              l,
              { ref: r },
            ),
          );
        });
      function d(e) {
        return i.includes(e);
      }
      l.propTypes = {
        orientation(e, r, t) {
          let a = e[r],
            s = String(a);
          return a && !d(a)
            ? Error(`Invalid prop \`orientation\` of value \`${s}\` supplied to \`${t}\`, expected one of:
  - horizontal
  - vertical

Defaulting to \`${o}\`.`)
            : null;
        },
      };
      let c = l;
    },
  },
  function (e) {
    e.O(0, [9929, 2254, 2649, 9233, 8920, 8962, 2971, 596, 1744], function () {
      return e((e.s = 23575));
    }),
      (_N_E = e.O());
  },
]);
