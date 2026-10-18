(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [6756],
  {
    14591: function (e, t, r) {
      Promise.resolve().then(r.bind(r, 2339));
    },
    2339: function (e, t, r) {
      "use strict";
      r.r(t),
        r.d(t, {
          default: function () {
            return w;
          },
        });
      var n = r(57437),
        a = r(2265),
        s = r(24033),
        o = r(93378),
        i = r(7798),
        l = r(68230),
        d = r(50176),
        c = r(67303),
        u = r(61865),
        m = r(38110),
        f = r(64992),
        x = r(31578),
        h = r(41303),
        p = r(82778),
        b = r(58625),
        v = r(15429),
        g = r(88920),
        y = (e) => {
          let { setOpenModal: t, setRequestIndicatorData: r } = e,
            [s, i] = (0, a.useState)([1]),
            [d, c] = (0, a.useState)(null),
            y = (0, u.cI)({ resolver: (0, m.F)(p.L4) }),
            w = (e) => (
              e.answers.map(
                (e, t) => (
                  t === d ? (e.mandatory = !0) : (e.mandatory = !1), e
                ),
              ),
              e
            ),
            j = () => {
              let e = JSON.parse(
                (0, l.parseCookies)()["".concat("FIEMS", "@progressData")],
              );
              return (
                "number" == typeof d
                  ? (e.hasMandatory = !0)
                  : (e.hasMandatory = !1),
                e
              );
            };
          return (0, n.jsx)(f.l0, {
            ...y,
            children: (0, n.jsxs)("form", {
              onSubmit: y.handleSubmit((e) => {
                let n = w(e),
                  a = j(),
                  s = { ...a, ...n };
                r(s), t(!0);
              }),
              className: "w-[800px] space-y-6",
              noValidate: !0,
              autoComplete: "off",
              children: [
                s.map((e, t) =>
                  (0, n.jsxs)(
                    "div",
                    {
                      className: "space-y-6",
                      children: [
                        (0, n.jsx)(f.Wi, {
                          name: "answers.".concat(t, ".description"),
                          control: y.control,
                          render: (e) => {
                            let { field: t } = e;
                            return (0, n.jsxs)(f.xJ, {
                              className:
                                "group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full",
                              children: [
                                (0, n.jsx)(f.NI, {
                                  children: (0, n.jsxs)(n.Fragment, {
                                    children: [
                                      (0, n.jsx)(x.g, {
                                        placeholder:
                                          "Digite uma descri\xe7\xe3o",
                                        className:
                                          "resize-none peer h-36 py-5 input-base",
                                        ...t,
                                      }),
                                      (0, n.jsx)(f.lX, {
                                        className:
                                          "input-label-float -top-4 left-2 text-xs z-30",
                                        children: "Descri\xe7\xe3o",
                                      }),
                                    ],
                                  }),
                                }),
                                (0, n.jsx)(f.zG, {}),
                              ],
                            });
                          },
                        }),
                        (0, n.jsxs)("div", {
                          className: "flex space-x-6 items-center",
                          children: [
                            (0, n.jsx)(f.Wi, {
                              name: "answers.".concat(t, ".title"),
                              control: y.control,
                              render: (e) => {
                                let { field: t } = e;
                                return (0, n.jsxs)(f.xJ, {
                                  className: "w-[300px] relative",
                                  children: [
                                    (0, n.jsxs)(v.Ph, {
                                      onValueChange: t.onChange,
                                      defaultValue: t.value,
                                      children: [
                                        (0, n.jsx)(f.NI, {
                                          children: (0, n.jsx)(v.i4, {
                                            children: (0, n.jsx)(v.ki, {
                                              placeholder:
                                                "N\xedvel de Maturidade",
                                            }),
                                          }),
                                        }),
                                        (0, n.jsx)(v.Bw, {
                                          children: (0, n.jsxs)(v.DI, {
                                            children: [
                                              (0, n.jsx)(v.n5, {
                                                children:
                                                  "Selecione um N\xedvel de Maturidade",
                                              }),
                                              h.bM.map((e) =>
                                                (0, n.jsx)(
                                                  v.Ql,
                                                  {
                                                    value: e.value,
                                                    children: e.text,
                                                  },
                                                  e.value,
                                                ),
                                              ),
                                            ],
                                          }),
                                        }),
                                      ],
                                    }),
                                    (0, n.jsx)(f.zG, { className: "w-fit" }),
                                  ],
                                });
                              },
                            }),
                            (0, n.jsx)(f.Wi, {
                              name: "answers.".concat(t, ".points"),
                              control: y.control,
                              render: (e) => {
                                let { field: t } = e;
                                return (0, n.jsxs)(f.xJ, {
                                  className: "w-[300px] relative",
                                  children: [
                                    (0, n.jsxs)(v.Ph, {
                                      onValueChange: t.onChange,
                                      defaultValue: t.value,
                                      children: [
                                        (0, n.jsx)(f.NI, {
                                          children: (0, n.jsx)(v.i4, {
                                            children: (0, n.jsx)(v.ki, {
                                              placeholder: "Pontua\xe7\xe3o",
                                            }),
                                          }),
                                        }),
                                        (0, n.jsx)(v.Bw, {
                                          children: (0, n.jsxs)(v.DI, {
                                            children: [
                                              (0, n.jsx)(v.n5, {
                                                children:
                                                  "Selecione uma Pontua\xe7\xe3o",
                                              }),
                                              h.o2.map((e) =>
                                                (0, n.jsx)(
                                                  v.Ql,
                                                  {
                                                    value: e.value,
                                                    children: e.text,
                                                  },
                                                  e.text,
                                                ),
                                              ),
                                            ],
                                          }),
                                        }),
                                      ],
                                    }),
                                    (0, n.jsx)(f.zG, {}),
                                  ],
                                });
                              },
                            }),
                            (0, n.jsx)(o.z, {
                              type: "button",
                              variant: "ghost",
                              size: "lg",
                              className:
                                "w-fit border border-neutral-02 p-1 hover:opacity-90",
                              onClick: () =>
                                s.length >= 1 &&
                                i([...s.slice(0, s.length - 1)]),
                              disabled: s.length <= 2,
                              children: (0, n.jsx)(g.Ybf, {
                                size: "24px",
                                className: "stroke-neutral ",
                              }),
                            }),
                          ],
                        }),
                        (0, n.jsx)(f.Wi, {
                          name: "answers.".concat(t, ".mandatory"),
                          control: y.control,
                          render: (e) => {
                            let { field: r } = e;
                            return (0, n.jsxs)(f.xJ, {
                              children: [
                                (0, n.jsx)(f.NI, {
                                  children: (0, n.jsxs)("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                      (0, n.jsx)(b.X, {
                                        checked: d === t,
                                        onCheckedChange: (e) =>
                                          d === t ? c(null) : c(t),
                                      }),
                                      (0, n.jsx)(f.lX, {
                                        className:
                                          "font-medium text-lg text-zind-600",
                                        children: "Obrigat\xf3ria",
                                      }),
                                    ],
                                  }),
                                }),
                                (0, n.jsx)(f.zG, {}),
                              ],
                            });
                          },
                        }),
                      ],
                    },
                    "answer" + t + "@",
                  ),
                ),
                (0, n.jsx)(o.z, {
                  type: "button",
                  size: "lg",
                  className: "w-full",
                  onClick: () => s.length <= 5 && i([...s, s.length + 1]),
                  disabled: s.length > 5,
                  children: "ADICIONAR OUTRA RESPOSTA",
                }),
                (0, n.jsx)(o.z, {
                  size: "lg",
                  className: "w-full",
                  variant: "success",
                  disabled: s.length < 2,
                  children: "SALVAR INDICADOR",
                }),
              ],
            }),
          });
        };
      function w() {
        let { registerIndicator: e } = (0, c.u)(),
          t = (0, s.useRouter)(),
          [r, u] = (0, a.useState)(null),
          [m, f] = (0, a.useState)(!1),
          [x, h] = (0, a.useState)(null);
        return (
          (0, a.useEffect)(() => {
            (() => {
              let e = JSON.parse(
                localStorage.getItem("@title-indicator") || "",
              );
              u(e);
            })();
          }, []),
          (0, n.jsxs)(n.Fragment, {
            children: [
              m &&
                (0, n.jsxs)(d.u.Root, {
                  closeModal: () => f(!1),
                  className: "w-[900px] px-20 rounded-2xl",
                  children: [
                    (0, n.jsx)(d.u.Title, {
                      classes:
                        "mb-9 font-medium text-3xl text-center text-slate-800",
                      children:
                        "Deseja cadastrar um novo indicador ou voltar para o painel de indicadores?",
                    }),
                    (0, n.jsxs)(d.u.Content, {
                      className: "flex justify-between gap-16 w-full",
                      children: [
                        (0, n.jsx)(o.z, {
                          size: "lg",
                          className: "w-full",
                          onClick: () => e(x),
                          children: "Cadastrar novo indicador",
                        }),
                        (0, n.jsx)(o.z, {
                          size: "lg",
                          className: "w-full",
                          variant: "error",
                          onClick: () => {
                            (0, l.destroyCookie)(
                              null,
                              "".concat("FIEMS", "@progressData"),
                            ),
                              (0, l.destroyCookie)(
                                null,
                                "".concat("FIEMS", "@progress"),
                              ),
                              t.push("/indicators");
                          },
                          children: "voltar para o painel",
                        }),
                      ],
                    }),
                  ],
                }),
              (0, n.jsxs)("section", {
                className:
                  "container ml-56 bg-gray-50 h-full flex flex-col gap-5 pb-10",
                children: [
                  (0, n.jsxs)(i.W.Root, {
                    children: [
                      (0, n.jsx)(i.W.OldPath, {
                        href: "/indicators",
                        children: "Indicadores",
                      }),
                      (0, n.jsx)(i.W.ArrowIcon, {}),
                      (0, n.jsx)(i.W.OldPath, {
                        href: "/indicators/create-indicator",
                        children: "Criar Indicador",
                      }),
                      (0, n.jsx)(i.W.ArrowIcon, {}),
                      (0, n.jsx)(i.W.CurrentPath, {
                        children: "Cadastrar respostas",
                      }),
                    ],
                  }),
                  (0, n.jsxs)("h3", { children: ["Resposta para ", r] }),
                  (0, n.jsx)(y, {
                    setOpenModal: f,
                    setRequestIndicatorData: h,
                  }),
                ],
              }),
            ],
          })
        );
      }
    },
    93378: function (e, t, r) {
      "use strict";
      r.d(t, {
        z: function () {
          return d;
        },
      });
      var n = r(57437),
        a = r(2265),
        s = r(67256),
        o = r(96061),
        i = r(22703);
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
        d = a.forwardRef((e, t) => {
          let { className: r, variant: a, size: o, asChild: d = !1, ...c } = e,
            u = d ? s.g7 : "button";
          return (0, n.jsx)(u, {
            className: (0, i.cn)(l({ variant: a, size: o, className: r })),
            ref: t,
            ...c,
          });
        });
      d.displayName = "Button";
    },
    58625: function (e, t, r) {
      "use strict";
      r.d(t, {
        X: function () {
          return l;
        },
      });
      var n = r(57437),
        a = r(2265),
        s = r(66062),
        o = r(69394),
        i = r(22703);
      let l = a.forwardRef((e, t) => {
        let { className: r, classIcon: a, ...l } = e;
        return (0, n.jsx)(s.fC, {
          ref: t,
          className: (0, i.cn)(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-white",
            r,
          ),
          ...l,
          children: (0, n.jsx)(s.z$, {
            className: (0, i.cn)(
              "flex items-center justify-center text-current",
            ),
            children: (0, n.jsx)(o.nQG, { className: (0, i.cn)("h-4 w-4", a) }),
          }),
        });
      });
      l.displayName = s.fC.displayName;
    },
    64992: function (e, t, r) {
      "use strict";
      r.d(t, {
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
          return x;
        },
        zG: function () {
          return v;
        },
      });
      var n = r(57437),
        a = r(2265),
        s = r(67256),
        o = r(61865),
        i = r(22703),
        l = r(58020);
      let d = o.RV,
        c = a.createContext({}),
        u = (e) => {
          let { ...t } = e;
          return (0, n.jsx)(c.Provider, {
            value: { name: t.name },
            children: (0, n.jsx)(o.Qr, { ...t }),
          });
        },
        m = () => {
          let e = a.useContext(c),
            t = a.useContext(f),
            { getFieldState: r, formState: n } = (0, o.Gc)(),
            s = r(e.name, n);
          if (!e) throw Error("useFormField should be used within <FormField>");
          let { id: i } = t;
          return {
            id: i,
            name: e.name,
            formItemId: "".concat(i, "-form-item"),
            formDescriptionId: "".concat(i, "-form-item-description"),
            formMessageId: "".concat(i, "-form-item-message"),
            ...s,
          };
        },
        f = a.createContext({}),
        x = a.forwardRef((e, t) => {
          let { className: r, ...s } = e,
            o = a.useId();
          return (0, n.jsx)(f.Provider, {
            value: { id: o },
            children: (0, n.jsx)("div", {
              ref: t,
              className: (0, i.cn)("space-y-2 relative", r),
              ...s,
            }),
          });
        });
      x.displayName = "FormItem";
      let h = a.forwardRef((e, t) => {
        let { className: r, ...a } = e,
          { error: s, formItemId: o } = m();
        return (0, n.jsx)(l._, {
          ref: t,
          className: (0, i.cn)(
            s &&
              "text-destructive body-m transition-colors ease-in-out duration-100",
            r,
          ),
          htmlFor: o,
          ...a,
        });
      });
      h.displayName = "FormLabel";
      let p = a.forwardRef((e, t) => {
        let { ...r } = e,
          {
            error: a,
            formItemId: o,
            formDescriptionId: i,
            formMessageId: l,
          } = m();
        return (0, n.jsx)(s.g7, {
          ref: t,
          id: o,
          "aria-describedby": a ? "".concat(i, " ").concat(l) : "".concat(i),
          "aria-invalid": !!a,
          ...r,
        });
      });
      p.displayName = "FormControl";
      let b = a.forwardRef((e, t) => {
        let { className: r, ...a } = e,
          { formDescriptionId: s } = m();
        return (0, n.jsx)("p", {
          ref: t,
          id: s,
          className: (0, i.cn)("text-[0.8rem] text-muted-foreground", r),
          ...a,
        });
      });
      b.displayName = "FormDescription";
      let v = a.forwardRef((e, t) => {
        let { className: r, children: a, ...s } = e,
          { error: o, formMessageId: l } = m(),
          d = o ? String(null == o ? void 0 : o.message) : a;
        return d
          ? (0, n.jsx)("p", {
              ref: t,
              id: l,
              className: (0, i.cn)(
                "text-[0.8rem] font-medium text-destructive absolute -bottom-4 text-xs text-rose-600",
                r,
              ),
              ...s,
              children: "Required" === d ? "Obrigat\xf3rio" : d,
            })
          : null;
      });
      v.displayName = "FormMessage";
    },
    58020: function (e, t, r) {
      "use strict";
      r.d(t, {
        _: function () {
          return d;
        },
      });
      var n = r(57437),
        a = r(2265),
        s = r(36743),
        o = r(96061),
        i = r(22703);
      let l = (0, o.j)(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        ),
        d = a.forwardRef((e, t) => {
          let { className: r, ...a } = e;
          return (0, n.jsx)(s.f, {
            ref: t,
            className: (0, i.cn)(l(), r),
            ...a,
          });
        });
      d.displayName = s.f.displayName;
    },
    15429: function (e, t, r) {
      "use strict";
      r.d(t, {
        Bw: function () {
          return m;
        },
        DI: function () {
          return d;
        },
        Ph: function () {
          return l;
        },
        Ql: function () {
          return x;
        },
        i4: function () {
          return u;
        },
        ki: function () {
          return c;
        },
        n5: function () {
          return f;
        },
      });
      var n = r(57437),
        a = r(2265),
        s = r(69394),
        o = r(93342),
        i = r(22703);
      let l = o.fC,
        d = o.ZA,
        c = o.B4,
        u = a.forwardRef((e, t) => {
          let { className: r, children: a, ...l } = e;
          return (0, n.jsxs)(o.xz, {
            ref: t,
            className: (0, i.cn)(
              "flex w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-primary focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 input-base h-12 text-zinc-500",
              r,
            ),
            ...l,
            children: [
              a,
              (0, n.jsx)(o.JO, {
                asChild: !0,
                children: (0, n.jsx)(s.jnn, {
                  className: "h-4 w-4 opacity-50",
                }),
              }),
            ],
          });
        });
      u.displayName = o.xz.displayName;
      let m = a.forwardRef((e, t) => {
        let { className: r, children: a, position: s = "popper", ...l } = e;
        return (0, n.jsx)(o.h_, {
          children: (0, n.jsx)(o.VY, {
            ref: t,
            className: (0, i.cn)(
              "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-card text-neutral-04 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              "popper" === s &&
                "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
              r,
            ),
            position: s,
            ...l,
            children: (0, n.jsx)(o.l_, {
              className: (0, i.cn)(
                "p-1",
                "popper" === s &&
                  "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
              ),
              children: a,
            }),
          }),
        });
      });
      m.displayName = o.VY.displayName;
      let f = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)(o.__, {
          ref: t,
          className: (0, i.cn)("px-2 text-sm font-semibold py-4 border-b", r),
          ...a,
        });
      });
      f.displayName = o.__.displayName;
      let x = a.forwardRef((e, t) => {
        let { className: r, children: a, ...l } = e;
        return (0, n.jsxs)(o.ck, {
          ref: t,
          className: (0, i.cn)(
            "relative flex w-full cursor-default select-none items-center rounded-sm pl-2 pr-8 text-sm outline-none focus:bg-neutral-01 focus:text-primary-03 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 border-b py-4",
            r,
          ),
          ...l,
          children: [
            (0, n.jsx)("span", {
              className:
                "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
              children: (0, n.jsx)(o.wU, {
                children: (0, n.jsx)(s.nQG, { className: "h-4 w-4" }),
              }),
            }),
            (0, n.jsx)(o.eT, { children: a }),
          ],
        });
      });
      x.displayName = o.ck.displayName;
      let h = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)(o.Z0, {
          ref: t,
          className: (0, i.cn)("-mx-1 my-1 h-px bg-primary-03", r),
          ...a,
        });
      });
      h.displayName = o.Z0.displayName;
    },
    31578: function (e, t, r) {
      "use strict";
      r.d(t, {
        g: function () {
          return o;
        },
      });
      var n = r(57437),
        a = r(2265),
        s = r(22703);
      let o = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("textarea", {
          className: (0, s.cn)(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            r,
          ),
          ref: t,
          ...a,
        });
      });
      o.displayName = "Textarea";
    },
    50176: function (e, t, r) {
      "use strict";
      r.d(t, {
        u: function () {
          return i;
        },
      });
      var n = r(57437),
        a = r(2265),
        s = r(23986),
        o = r(41513);
      let i = {
        Root: (e) => {
          let { children: t, closeModal: r, btnClosed: i = !0, ...l } = e,
            d = (0, a.useRef)(null),
            c = (0, a.useCallback)(
              (e) => {
                d.current && "Escape" === e.key && r();
              },
              [r],
            );
          return (
            (0, a.useEffect)(
              () => (
                window.addEventListener("keydown", c),
                d && document.documentElement.classList.add("overflow-hidden"),
                () => {
                  window.removeEventListener("keydown", c),
                    document.documentElement.classList.remove(
                      "overflow-hidden",
                    );
                }
              ),
              [c],
            ),
            (0, n.jsx)("div", {
              className:
                "fixed top-0 left-0 w-full h-screen bg-black/25 z-50 flex items-center justify-center data-[body]:h-screen data-[body]:overflow-hidden",
              id: "root",
              children: (0, n.jsxs)("div", {
                className: (0, s.m)(
                  "relative bg-white h-fit rounded-md shadow-md p-7",
                  l.className,
                ),
                ref: d,
                children: [
                  i &&
                    (0, n.jsx)("button", {
                      className:
                        "absolute top-2 right-2 font-semibold text-base p-2",
                      onClick: r,
                      children: (0, n.jsx)(o.JO, {
                        icon: "gg:close-r",
                        width: "30px",
                        className: "text-primary-03 hover:text-primary-03/90",
                      }),
                    }),
                  t,
                ],
              }),
            })
          );
        },
        Title: (e) => {
          let { children: t, classes: r } = e;
          return (0, n.jsx)("h1", {
            className: (0, s.m)("text-base", r),
            children: t,
          });
        },
        SubTitle: (e) => {
          let { children: t, className: r } = e;
          return (0, n.jsx)("span", {
            className: (0, s.m)("text-base", r),
            children: t,
          });
        },
        Content: (e) => {
          let { children: t, ...r } = e;
          return (0, n.jsx)("div", {
            className: (0, s.m)("", r.className),
            children: t,
          });
        },
      };
    },
    7798: function (e, t, r) {
      "use strict";
      r.d(t, {
        W: function () {
          return i;
        },
      });
      var n = r(57437);
      r(2265);
      var a = r(58910),
        s = r(61396),
        o = r.n(s);
      let i = {
        Root: (e) => {
          let { children: t } = e;
          return (0, n.jsx)("div", {
            className: "flex items-center justify-end gap-1",
            children: t,
          });
        },
        OldPath: (e) => {
          let { href: t, children: r } = e;
          return (0, n.jsx)(o(), {
            href: t,
            className: "font-bold text-blue-600",
            children: r,
          });
        },
        ArrowIcon: () => (0, n.jsx)(a.KEG, { className: "fill-gray-600" }),
        CurrentPath: (e) => {
          let { children: t } = e;
          return (0, n.jsx)("span", {
            className: "text-gray-600 cursor-pointer",
            children: t,
          });
        },
      };
    },
    67303: function (e, t, r) {
      "use strict";
      r.d(t, {
        u: function () {
          return s;
        },
      });
      var n = r(17746),
        a = r(2265);
      let s = () => (0, a.useContext)(n.H);
    },
    22703: function (e, t, r) {
      "use strict";
      r.d(t, {
        cn: function () {
          return s;
        },
      });
      var n = r(57042),
        a = r(23986);
      function s() {
        for (var e = arguments.length, t = Array(e), r = 0; r < e; r++)
          t[r] = arguments[r];
        return (0, a.m)((0, n.W)(t));
      }
    },
    41303: function (e, t, r) {
      "use strict";
      r.d(t, {
        ai: function () {
          return n;
        },
        bM: function () {
          return s;
        },
        k1: function () {
          return a;
        },
        o2: function () {
          return o;
        },
      });
      let n = [
          { text: "Micro", value: "MICRO_PEQUENA" },
          { text: "M\xe9dia", value: "MEDIA" },
          { text: "Grande", value: "GRANDE" },
        ],
        a = [
          { text: "Ambiental", value: "E" },
          { text: "Social", value: "S" },
          { text: "Governan\xe7a", value: "G" },
        ],
        s = [
          { text: "Engajada", value: "Engajado" },
          { text: "Iniciante", value: "Iniciante" },
          { text: "Sensibilizada", value: "Sensibilizada" },
          { text: "Consciente", value: "Consciente" },
          { text: "N\xe3o conforme", value: "Nao_conforme" },
          { text: "Conforme", value: "Conforme" },
        ],
        o = [
          { text: "0", value: "0" },
          { text: "2", value: "2" },
          { text: "4", value: "4" },
          { text: "6", value: "6" },
          { text: "8", value: "8" },
          { text: "10", value: "10" },
        ];
    },
    82778: function (e, t, r) {
      "use strict";
      r.d(t, {
        Ix: function () {
          return i;
        },
        Iy: function () {
          return o;
        },
        L4: function () {
          return d;
        },
      });
      var n = r(74578);
      let a = n.z.enum(
          [
            "Engajado",
            "Iniciante",
            "Sensibilizada",
            "Consciente",
            "Nao_conforme",
            "Conforme",
          ],
          { required_error: "*Por favor selecione um nivel de maturidade" },
        ),
        s = n.z.enum(["0", "2", "4", "6", "8", "10"], {
          required_error: "*Por favor selecione uma pontua\xe7\xe3o",
        }),
        o = n.z.object({
          section: n.z.string({
            required_error: "*Por favor selecione um Caderno Setorial ",
          }),
        }),
        i = n.z.object({
          title: n.z.string({
            required_error: "*O campo t\xedtulo \xe9 obrigat\xf3rio",
          }),
          category: n.z.string({
            required_error: "*O campo categoria \xe9 obrigat\xf3rio",
          }),
          subcategory: n.z.string({
            required_error: "*O campo subcategoria \xe9 obrigat\xf3rio",
          }),
          description: n.z.string({
            required_error: "*O campo descri\xe7\xe3o \xe9 obrigat\xf3rio",
          }),
          hasMandatory: n.z.boolean().optional(),
        }),
        l = n.z.object({
          description: n.z.string({
            required_error: "*O campo descri\xe7\xe3o \xe9 obrigat\xf3rio",
          }),
          title: a,
          points: s,
          mandatory: n.z.boolean().optional(),
        }),
        d = n.z.object({ answers: n.z.array(l).min(2).max(6) }),
        c = o.merge(i),
        u = l.omit({ points: !0 }).extend({ points: n.z.number() }),
        m = c
          .merge(n.z.object({ answers: n.z.array(u).min(2).max(2) }))
          .omit({ section: !0 });
      c.merge(d),
        n.z.object({
          data: n.z.array(m),
          section: n.z.string({
            required_error: "*Por favor selecione um Caderno Setorial ",
          }),
        });
    },
    61396: function (e, t, r) {
      e.exports = r(46685);
    },
    66062: function (e, t, r) {
      "use strict";
      r.d(t, {
        fC: function () {
          return N;
        },
        z$: function () {
          return C;
        },
      });
      var n = r(13428),
        a = r(2265),
        s = r(42210),
        o = r(56989),
        i = r(85744),
        l = r(73763),
        d = r(85184),
        c = r(94977),
        u = r(85606),
        m = r(9381);
      let f = "Checkbox",
        [x, h] = (0, o.b)(f),
        [p, b] = x(f),
        v = (0, a.forwardRef)((e, t) => {
          let {
              __scopeCheckbox: r,
              name: o,
              checked: d,
              defaultChecked: c,
              required: u,
              disabled: f,
              value: x = "on",
              onCheckedChange: h,
              ...b
            } = e,
            [v, g] = (0, a.useState)(null),
            N = (0, s.e)(t, (e) => g(e)),
            C = (0, a.useRef)(!1),
            z = !v || !!v.closest("form"),
            [k = !1, E] = (0, l.T)({ prop: d, defaultProp: c, onChange: h }),
            I = (0, a.useRef)(k);
          return (
            (0, a.useEffect)(() => {
              let e = null == v ? void 0 : v.form;
              if (e) {
                let t = () => E(I.current);
                return (
                  e.addEventListener("reset", t),
                  () => e.removeEventListener("reset", t)
                );
              }
            }, [v, E]),
            (0, a.createElement)(
              p,
              { scope: r, state: k, disabled: f },
              (0, a.createElement)(
                m.WV.button,
                (0, n.Z)(
                  {
                    type: "button",
                    role: "checkbox",
                    "aria-checked": w(k) ? "mixed" : k,
                    "aria-required": u,
                    "data-state": j(k),
                    "data-disabled": f ? "" : void 0,
                    disabled: f,
                    value: x,
                  },
                  b,
                  {
                    ref: N,
                    onKeyDown: (0, i.M)(e.onKeyDown, (e) => {
                      "Enter" === e.key && e.preventDefault();
                    }),
                    onClick: (0, i.M)(e.onClick, (e) => {
                      E((e) => !!w(e) || !e),
                        z &&
                          ((C.current = e.isPropagationStopped()),
                          C.current || e.stopPropagation());
                    }),
                  },
                ),
              ),
              z &&
                (0, a.createElement)(y, {
                  control: v,
                  bubbles: !C.current,
                  name: o,
                  value: x,
                  checked: k,
                  required: u,
                  disabled: f,
                  style: { transform: "translateX(-100%)" },
                }),
            )
          );
        }),
        g = (0, a.forwardRef)((e, t) => {
          let { __scopeCheckbox: r, forceMount: s, ...o } = e,
            i = b("CheckboxIndicator", r);
          return (0, a.createElement)(
            u.z,
            { present: s || w(i.state) || !0 === i.state },
            (0, a.createElement)(
              m.WV.span,
              (0, n.Z)(
                {
                  "data-state": j(i.state),
                  "data-disabled": i.disabled ? "" : void 0,
                },
                o,
                { ref: t, style: { pointerEvents: "none", ...e.style } },
              ),
            ),
          );
        }),
        y = (e) => {
          let { control: t, checked: r, bubbles: s = !0, ...o } = e,
            i = (0, a.useRef)(null),
            l = (0, d.D)(r),
            u = (0, c.t)(t);
          return (
            (0, a.useEffect)(() => {
              let e = i.current,
                t = window.HTMLInputElement.prototype,
                n = Object.getOwnPropertyDescriptor(t, "checked"),
                a = n.set;
              if (l !== r && a) {
                let t = new Event("click", { bubbles: s });
                (e.indeterminate = w(r)),
                  a.call(e, !w(r) && r),
                  e.dispatchEvent(t);
              }
            }, [l, r, s]),
            (0, a.createElement)(
              "input",
              (0, n.Z)(
                {
                  type: "checkbox",
                  "aria-hidden": !0,
                  defaultChecked: !w(r) && r,
                },
                o,
                {
                  tabIndex: -1,
                  ref: i,
                  style: {
                    ...e.style,
                    ...u,
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
      function w(e) {
        return "indeterminate" === e;
      }
      function j(e) {
        return w(e) ? "indeterminate" : e ? "checked" : "unchecked";
      }
      let N = v,
        C = g;
    },
    85606: function (e, t, r) {
      "use strict";
      r.d(t, {
        z: function () {
          return i;
        },
      });
      var n = r(2265),
        a = r(54887),
        s = r(42210),
        o = r(51030);
      let i = (e) => {
        let { present: t, children: r } = e,
          i = (function (e) {
            var t;
            let [r, s] = (0, n.useState)(),
              i = (0, n.useRef)({}),
              d = (0, n.useRef)(e),
              c = (0, n.useRef)("none"),
              u = e ? "mounted" : "unmounted",
              [m, f] =
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
                (0, n.useReducer)((e, r) => {
                  let n = t[e][r];
                  return null != n ? n : e;
                }, u));
            return (
              (0, n.useEffect)(() => {
                let e = l(i.current);
                c.current = "mounted" === m ? e : "none";
              }, [m]),
              (0, o.b)(() => {
                let t = i.current,
                  r = d.current,
                  n = r !== e;
                if (n) {
                  let n = c.current,
                    a = l(t);
                  e
                    ? f("MOUNT")
                    : "none" === a ||
                        (null == t ? void 0 : t.display) === "none"
                      ? f("UNMOUNT")
                      : r && n !== a
                        ? f("ANIMATION_OUT")
                        : f("UNMOUNT"),
                    (d.current = e);
                }
              }, [e, f]),
              (0, o.b)(() => {
                if (r) {
                  let e = (e) => {
                      let t = l(i.current),
                        n = t.includes(e.animationName);
                      e.target === r &&
                        n &&
                        (0, a.flushSync)(() => f("ANIMATION_END"));
                    },
                    t = (e) => {
                      e.target === r && (c.current = l(i.current));
                    };
                  return (
                    r.addEventListener("animationstart", t),
                    r.addEventListener("animationcancel", e),
                    r.addEventListener("animationend", e),
                    () => {
                      r.removeEventListener("animationstart", t),
                        r.removeEventListener("animationcancel", e),
                        r.removeEventListener("animationend", e);
                    }
                  );
                }
                f("ANIMATION_END");
              }, [r, f]),
              {
                isPresent: ["mounted", "unmountSuspended"].includes(m),
                ref: (0, n.useCallback)((e) => {
                  e && (i.current = getComputedStyle(e)), s(e);
                }, []),
              }
            );
          })(t),
          d =
            "function" == typeof r
              ? r({ present: i.isPresent })
              : n.Children.only(r),
          c = (0, s.e)(i.ref, d.ref),
          u = "function" == typeof r;
        return u || i.isPresent ? (0, n.cloneElement)(d, { ref: c }) : null;
      };
      function l(e) {
        return (null == e ? void 0 : e.animationName) || "none";
      }
      i.displayName = "Presence";
    },
  },
  function (e) {
    e.O(
      0,
      [
        8310, 1582, 2254, 2649, 9233, 6685, 3688, 3342, 8920, 1513, 8962, 2971,
        596, 1744,
      ],
      function () {
        return e((e.s = 14591));
      },
    ),
      (_N_E = e.O());
  },
]);
