(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [593],
  {
    12857: function (e, t, r) {
      Promise.resolve().then(r.bind(r, 98965));
    },
    98965: function (e, t, r) {
      "use strict";
      r.r(t),
        r.d(t, {
          default: function () {
            return _;
          },
        });
      var s = r(57437),
        a = r(93378),
        n = r(58020),
        i = r(31578),
        l = r(96882),
        o = r(64992),
        c = r(93695),
        u = r(67303),
        d = r(74578);
      let m = d.z.object({ answerText: d.z.string().optional() }),
        x = d.z.object({
          fileType: d.z.string(),
          name: d.z.string(),
          url: d.z.string(),
        });
      d.z.object({
        answerId: d.z.string().optional(),
        answerText: d.z.string().nullish(),
        filesToCreate: d.z.array(x).optional(),
        filesToAdd: d.z.array(d.z.string().uuid()).optional(),
        nonApplicable: d.z.boolean().optional(),
        nonCompliant: d.z.boolean().optional(),
        addToGed: d.z.boolean().optional(),
      });
      var f = r(38110),
        p = r(2265),
        h = r(61865),
        v = r(36468),
        j = r(39830),
        b = r(89348),
        g = r(58625),
        N = r(43027),
        y = r(22503),
        w = r(59687),
        z = (e) => {
          let {
              answerSelected: t,
              nonApplicable: r,
              report: l,
              companyId: d,
              setModalError: x,
            } = e,
            [z, C] = (0, p.useState)([]),
            [S, T] = (0, p.useState)(!1),
            [F, I] = (0, p.useState)(null),
            [E, q] = (0, p.useState)([]),
            { answerIndicator: R } = (0, u.u)(),
            k = (0, h.cI)({ resolver: (0, f.F)(m) }),
            A = (e, t, r) => {
              if (e < 0 || t.length <= 0 || e >= t.length) return;
              let s = Array.from(t);
              s.splice(e, 1), r(s);
            },
            _ = async () => {
              let e = await Promise.all(
                E.map(async (e) => {
                  try {
                    let t = await (0, N.k3)(d, e);
                    return t.data;
                  } catch (e) {
                    console.error("Erro ao subir arquivo:", e);
                    return;
                  }
                }),
              );
              return e.some((e) => void 0 === e)
                ? (x(!0), !1)
                : e.filter((e) => void 0 !== e);
            },
            O = async (e) => {
              let s = await _();
              if (s) {
                let a = {
                  filesToCreate: s,
                  answerText:
                    e.answerText && e.answerText.length > 0
                      ? e.answerText
                      : void 0,
                  addToGed: S,
                  nonApplicable: r,
                  answerId: r ? void 0 : t,
                };
                R(a, l.id, d);
              }
            },
            D = (e) => {
              var t;
              if (
                e.currentTarget.files &&
                (null === (t = e.currentTarget.files) || void 0 === t
                  ? void 0
                  : t.length) > 0
              ) {
                let t = e.currentTarget.files[0];
                t.size <= 52428800
                  ? (C([...z, t]), I(null), (e.currentTarget.value = ""))
                  : I(
                      "O Arquivo selecionado excede o limite de 50mb. Selecione outro",
                    );
              }
              return null;
            },
            G = async () => {
              q([...E, ...z]), C([]);
            };
          return (0, s.jsx)(o.l0, {
            ...k,
            children: (0, s.jsx)("form", {
              onSubmit: k.handleSubmit(O),
              children: (0, s.jsxs)("div", {
                className: "space-y-8",
                children: [
                  (0, s.jsx)(o.Wi, {
                    name: "answerText",
                    control: k.control,
                    defaultValue: l.answerText ? l.answerText : "",
                    render: (e) => {
                      let { field: t } = e;
                      return (0, s.jsxs)("div", {
                        className: "space-y-4",
                        children: [
                          (0, s.jsxs)(o.xJ, {
                            className:
                              "group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full",
                            children: [
                              (0, s.jsx)(o.NI, {
                                children: (0, s.jsxs)(s.Fragment, {
                                  children: [
                                    (0, s.jsx)(i.g, {
                                      placeholder: "Digite uma descri\xe7\xe3o",
                                      className: "resize-none peer h-36 py-5",
                                      ...t,
                                    }),
                                    (0, s.jsx)(o.lX, {
                                      className:
                                        "input-label-float -top-4 left-2 text-xs z-40",
                                      children: "Resposta",
                                    }),
                                  ],
                                }),
                              }),
                              (0, s.jsx)(o.zG, {}),
                            ],
                          }),
                          (0, s.jsx)("p", {
                            className: "text-sm",
                            children:
                              "Utilize este campo para discorrer sobre as pr\xe1ticas de sua empresa em rela\xe7\xe3o a este indicador, ou mesmo para orientar o auditor sobre as demais informa\xe7\xf5es e documentos que voc\xea est\xe1 apresentando como evid\xeancia. Recomendamos que voc\xea preencha este campo, para qualificar sua resposta e aumentar as chances de aprova\xe7\xe3o.",
                          }),
                        ],
                      });
                    },
                  }),
                  (0, s.jsxs)("div", {
                    className: "flex flex-col gap-3",
                    children: [
                      (0, s.jsxs)("div", {
                        className: "space-y-2",
                        children: [
                          (0, s.jsx)("h3", {
                            className: "font-semibold text-3xl",
                            children: "Upload",
                          }),
                          (0, s.jsx)("p", {
                            className: "text-sm",
                            children:
                              "Fa\xe7a upload dos seus arquivos atrav\xe9s dos arquivos do seu computador, ou diretamente do Gerenciador Eletr\xf4nico de Documentos (GED)",
                          }),
                        ],
                      }),
                      (0, s.jsxs)("div", {
                        className:
                          "flex flex-col gap-2 w-[70%] overflow-hidden",
                        children: [
                          (0, s.jsxs)("div", {
                            className: "flex gap-4 w-full",
                            children: [
                              (0, s.jsxs)("div", {
                                className:
                                  " flex justify-center bg-primary-main hover:bg-primary-main/90 text-neutral-01 h-10 rounded-sm transition duration-300 ease-in-outite w-1/2",
                                children: [
                                  (0, s.jsxs)(n._, {
                                    htmlFor: "fileInput",
                                    className:
                                      "bg-transparent flex items-center justify-center flex-1 font-bold cursor-pointer uppercase",
                                    children: [
                                      "upload meu computador",
                                      (0, s.jsx)(j.JO, {
                                        icon: "basil:upload-solid",
                                        width: 24,
                                        style: { marginLeft: "8px" },
                                      }),
                                    ],
                                  }),
                                  (0, s.jsx)(c.I, {
                                    type: "file",
                                    className: "hidden",
                                    id: "fileInput",
                                    onChange: (e) => D(e),
                                  }),
                                ],
                              }),
                              (0, s.jsx)(y.Z, { questionReportId: l.id }),
                            ],
                          }),
                          (0, s.jsxs)("span", {
                            className: "flex items-center gap-1 text-sm",
                            children: [
                              (0, s.jsx)(b.ite, {}),
                              "Selecione arquivos de at\xe9 50mb",
                            ],
                          }),
                        ],
                      }),
                      (0, s.jsx)(w.p, { files: z, remove: (e) => A(e, z, C) }),
                      F &&
                        (0, s.jsxs)("span", {
                          className:
                            "flex items-center gap-1 text-sm text-semantic-error",
                          children: [(0, s.jsx)(b.ite, {}), F],
                        }),
                      (0, s.jsxs)("div", {
                        className: "flex gap-2 items-center",
                        children: [
                          (0, s.jsx)(g.X, {
                            onClick: () => T(!0),
                            className:
                              "border-primary-main data-[state=checked]:bg-primary-main data-[state=checked]:text-white",
                          }),
                          (0, s.jsx)("span", {
                            className: "text-lg text-medium text-neutral-03",
                            children:
                              "Salvar arquivo em GED (Gerenciador Eletr\xf4nico de Documentos)",
                          }),
                        ],
                      }),
                      (0, s.jsxs)(a.z, {
                        className:
                          "max-w-[390px] bg-primary-main hover:bg-primary-main/90 disabled:bg-primary-main/60",
                        disabled: z.length <= 0,
                        type: "button",
                        onClick: G,
                        children: [
                          (0, s.jsx)(j.JO, {
                            icon: "mingcute:send-line",
                            className: "mr-1",
                          }),
                          "ENVIAR ARQUIVO",
                        ],
                      }),
                      (0, s.jsxs)("div", {
                        className: "space-y-6 mt-5 mb-4",
                        children: [
                          (0, s.jsx)("h3", {
                            className: "font-semibold text-3xl",
                            children: "Arquivos carregados",
                          }),
                          (0, s.jsx)(w.p, {
                            files: [...l.files, ...E],
                            remove: (e) => A(e, E, q),
                          }),
                        ],
                      }),
                    ],
                  }),
                  (0, s.jsxs)(a.z, {
                    size: "lg",
                    variant: "success",
                    disabled: null == t && !r,
                    className: "w-[60%]",
                    type: "submit",
                    children: [
                      (0, s.jsx)("span", {
                        className: "font-bold text-lg mr-1",
                        children: "Salvar",
                      }),
                      (0, s.jsx)(v.Tri, { size: "1.5rem" }),
                    ],
                  }),
                ],
              }),
            }),
          });
        },
        C = r(50176),
        S = r(13012),
        T = r(26058),
        F = r(38324),
        I = r(41513),
        E = r(61396),
        q = r.n(E),
        R = r(24033),
        k = r(58910),
        A = r(37846);
      function _() {
        let [e, t] = (0, p.useState)(!1),
          [r, o] = (0, p.useState)(!1),
          [c, d] = (0, p.useState)(null),
          [m, x] = (0, p.useState)(null),
          [f, h] = (0, p.useState)(!0),
          [j, b] = (0, p.useState)(!1),
          [g, N] = (0, p.useState)(""),
          { addRedflag: y, removeRedflag: w } = (0, u.u)(),
          E = (0, R.useParams)(),
          _ = Array.isArray(E.id) ? E.id[0] : E.id;
        if (
          ((0, p.useEffect)(() => {
            f && x(null);
          }, [f]),
          (0, p.useEffect)(() => {
            let e = async () => {
              try {
                let { data: e } = await (0, T.IH)(_);
                e.question.answers.sort(
                  (e, t) => (0, F.co)(e.title) - (0, F.co)(t.title),
                ),
                  d(e),
                  h(e.nonApplicable),
                  e.selectedAnswer && x(e.selectedAnswer.id);
              } catch (e) {
                console.error("Erro ao obter o Indicator:", e);
              }
            };
            e();
          }, [_]),
          !c)
        )
          return null;
        let O = c.question.description.indexOf("Verifica\xe7\xe3o:"),
          D = c.question.description.slice(0, O),
          G = c.question.description.slice(O),
          P = (e) => {
            "remove" === e
              ? (b(!1), w(c.id, d))
              : (b(!0), y(g, c.id, d), N("")),
              t(!1);
          };
        return (0, s.jsxs)(s.Fragment, {
          children: [
            e &&
              (0, s.jsxs)(C.u.Root, {
                closeModal: () => t(!1),
                btnClosed: !1,
                className: "flex flex-col gap-4 w-[70%] z-50",
                children: [
                  (0, s.jsx)(C.u.Title, {
                    classes: "font-medium text-center text-slate-800 text-3xl",
                    children: j
                      ? "Tem certeza sobre isso ?"
                      : "O que gostaria de lembrar?",
                  }),
                  (0, s.jsxs)(C.u.Content, {
                    className: "space-y-4",
                    children: [
                      !j &&
                        (0, s.jsxs)("div", {
                          className:
                            "group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full",
                          children: [
                            (0, s.jsx)(i.g, {
                              placeholder: "Digite uma descri\xe7\xe3o",
                              className:
                                "resize-none peer h-36 py-5 input-base",
                              onChange: (e) => N(e.currentTarget.value),
                              value: g,
                            }),
                            (0, s.jsx)(n._, {
                              className:
                                "input-label-float -top-2 left-2 text-xs z-30",
                              children: "Descri\xe7\xe3o",
                            }),
                          ],
                        }),
                      (0, s.jsxs)("div", {
                        className: "flex justify-center gap-14",
                        children: [
                          (0, s.jsx)(a.z, {
                            size: "lg",
                            variant: "error",
                            className: "w-1/2",
                            onClick: () => t(!1),
                            children: "Cancelar",
                          }),
                          (0, s.jsxs)(a.z, {
                            size: "lg",
                            variant: "success",
                            className: "w-1/2",
                            onClick: () => P(j ? "remove" : "add"),
                            children: [
                              (0, s.jsx)("span", {
                                className: "font-bold text-lg mr-1",
                                children: j ? "Excluir" : "Salvar",
                              }),
                              !j &&
                                (0, s.jsx)(v.Tri, {
                                  size: "1.5rem",
                                  className: "stroke-white",
                                }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            r &&
              (0, s.jsxs)(C.u.Root, {
                closeModal: () => o(!1),
                className: "flex flex-col items-center w-[639px]",
                children: [
                  (0, s.jsx)(I.JO, {
                    icon: "ph:x-circle-bold",
                    className: "text-semantic-error w-32 h-32",
                  }),
                  (0, s.jsx)(C.u.Title, {
                    classes: "text-neutral text-3xl",
                    children: "Erro",
                  }),
                  (0, s.jsx)(C.u.Content, {
                    children: (0, s.jsx)("p", {
                      className:
                        "text-xl font-semibold text-semantic-error text-center",
                      children:
                        "J\xe1 existe um arquivo com esse nome ou ele cont\xe9m caracteres n\xe3o permitidos, como espa\xe7os. Renomeie o arquivo e tente novamente.",
                    }),
                  }),
                ],
              }),
            (0, s.jsxs)("section", {
              className: "container space-y-6 pb-10",
              children: [
                (0, s.jsxs)(q(), {
                  href: "/companies/".concat(c.report.companyId),
                  className:
                    "bg-primary-03 hover:bg-primary-03/90 px-6 py-1 rounded-md shadow-md text-white text-base flex items-center gap-1 w-fit",
                  children: [(0, s.jsx)(A.VG_, { size: "1.5rem" }), "VOLTAR"],
                }),
                (0, s.jsxs)("div", {
                  className: "space-y-8",
                  children: [
                    (0, s.jsxs)("h3", {
                      children: [c.question.code, ": ", c.question.title],
                    }),
                    (0, s.jsxs)("p", {
                      children: [
                        (0, s.jsx)("span", {
                          className: "font-bold mr-1",
                          children: "Descri\xe7\xe3o:",
                        }),
                        D,
                      ],
                    }),
                    (0, s.jsxs)("p", {
                      className: "w-full",
                      children: [
                        (0, s.jsx)("span", {
                          className: "font-bold mr-1",
                          children: "Verifica\xe7\xe3o:",
                        }),
                        G.replace("Verifica\xe7\xe3o:", ""),
                      ],
                    }),
                    (0, s.jsx)("ul", {
                      className: "flex space-x-3 w-full",
                      children: c.question.answers.map((e) =>
                        (0, s.jsxs)(
                          l.Fz,
                          {
                            variant: m && m !== e.id ? "disabled" : e.title,
                            children: [
                              (0, s.jsx)(l.Vd, { children: S.HY[e.title] }),
                              (0, s.jsx)(l.rb, { children: e.points }),
                              (0, s.jsx)(l.dX, { children: e.description }),
                              e.mandatory && (0, s.jsx)(l.Rk, {}),
                              m && m === e.id && (0, s.jsx)(l.ED, {}),
                              (0, s.jsx)(a.z, {
                                className: "w-full",
                                size: "lg",
                                variant:
                                  m && m !== e.id
                                    ? "neutral-02"
                                    : m === e.id
                                      ? "success"
                                      : "card-answer",
                                onClick: () => (x(e.id), h(!1)),
                                children: "Selecionar",
                              }),
                            ],
                          },
                          e.id,
                        ),
                      ),
                    }),
                    (0, s.jsxs)("div", {
                      className: "space-x-4 mt-2",
                      children: [
                        (0, s.jsxs)(a.z, {
                          size: "lg",
                          onClick: () => t(!0),
                          className: "".concat(
                            j ? "bg-primary-03" : "bg-primary",
                          ),
                          children: [
                            j ? "Excluir Lembrete" : "Lembrar-me",
                            (0, s.jsxs)("div", {
                              className: "relative",
                              children: [
                                (0, s.jsx)(k.KGF, {
                                  size: "1.25rem",
                                  className:
                                    "ml-1 fill-semantic-error [&[data-state=open]>svg]:rotate-0",
                                }),
                                j &&
                                  (0, s.jsx)("div", {
                                    className:
                                      "absolute top-2 left-[0.5px] -rotate-45 bg-white h-[1.5px] w-5",
                                  }),
                              ],
                            }),
                          ],
                        }),
                        (0, s.jsx)(a.z, {
                          size: "lg",
                          variant: "error",
                          disabled: f,
                          onClick: () => {
                            h(!0), P("add");
                          },
                          children: "N\xe3o se aplica",
                        }),
                      ],
                    }),
                    c.redflagIssuer &&
                      (0, s.jsxs)("div", {
                        className: "".concat(
                          "CONSULTOR" === c.redflagIssuer.role
                            ? "bg-[#FFF1BF]"
                            : "bg-[#FCC7C7]",
                          "  rounded-lg min-h-[64px] h-fit w-full px-4 py-2 flex flex-col flex-wrap justify-center",
                        ),
                        children: [
                          (0, s.jsxs)("p", {
                            className: "font-semibold text-base",
                            children: [
                              (0, s.jsx)("span", {
                                className: "inline-block mr-2",
                                children: (0, s.jsx)(k.KGF, {
                                  size: "1.25rem",
                                  className:
                                    "ml-1  fill-semantic-error [&[data-state=open]>svg]:rotate-0",
                                }),
                              }),
                              c.redflag,
                            ],
                          }),
                          (0, s.jsx)("span", {
                            children: (0, F.jv)(c.redflag_date),
                          }),
                        ],
                      }),
                    (0, s.jsx)(z, {
                      answerSelected: m,
                      nonApplicable: f,
                      report: c,
                      companyId: c.report.companyId,
                      setModalError: o,
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      }
    },
    64992: function (e, t, r) {
      "use strict";
      r.d(t, {
        NI: function () {
          return h;
        },
        Wi: function () {
          return d;
        },
        l0: function () {
          return c;
        },
        lX: function () {
          return p;
        },
        xJ: function () {
          return f;
        },
        zG: function () {
          return j;
        },
      });
      var s = r(57437),
        a = r(2265),
        n = r(67256),
        i = r(61865),
        l = r(22703),
        o = r(58020);
      let c = i.RV,
        u = a.createContext({}),
        d = (e) => {
          let { ...t } = e;
          return (0, s.jsx)(u.Provider, {
            value: { name: t.name },
            children: (0, s.jsx)(i.Qr, { ...t }),
          });
        },
        m = () => {
          let e = a.useContext(u),
            t = a.useContext(x),
            { getFieldState: r, formState: s } = (0, i.Gc)(),
            n = r(e.name, s);
          if (!e) throw Error("useFormField should be used within <FormField>");
          let { id: l } = t;
          return {
            id: l,
            name: e.name,
            formItemId: "".concat(l, "-form-item"),
            formDescriptionId: "".concat(l, "-form-item-description"),
            formMessageId: "".concat(l, "-form-item-message"),
            ...n,
          };
        },
        x = a.createContext({}),
        f = a.forwardRef((e, t) => {
          let { className: r, ...n } = e,
            i = a.useId();
          return (0, s.jsx)(x.Provider, {
            value: { id: i },
            children: (0, s.jsx)("div", {
              ref: t,
              className: (0, l.cn)("space-y-2 relative", r),
              ...n,
            }),
          });
        });
      f.displayName = "FormItem";
      let p = a.forwardRef((e, t) => {
        let { className: r, ...a } = e,
          { error: n, formItemId: i } = m();
        return (0, s.jsx)(o._, {
          ref: t,
          className: (0, l.cn)(
            n &&
              "text-destructive body-m transition-colors ease-in-out duration-100",
            r,
          ),
          htmlFor: i,
          ...a,
        });
      });
      p.displayName = "FormLabel";
      let h = a.forwardRef((e, t) => {
        let { ...r } = e,
          {
            error: a,
            formItemId: i,
            formDescriptionId: l,
            formMessageId: o,
          } = m();
        return (0, s.jsx)(n.g7, {
          ref: t,
          id: i,
          "aria-describedby": a ? "".concat(l, " ").concat(o) : "".concat(l),
          "aria-invalid": !!a,
          ...r,
        });
      });
      h.displayName = "FormControl";
      let v = a.forwardRef((e, t) => {
        let { className: r, ...a } = e,
          { formDescriptionId: n } = m();
        return (0, s.jsx)("p", {
          ref: t,
          id: n,
          className: (0, l.cn)("text-[0.8rem] text-muted-foreground", r),
          ...a,
        });
      });
      v.displayName = "FormDescription";
      let j = a.forwardRef((e, t) => {
        let { className: r, children: a, ...n } = e,
          { error: i, formMessageId: o } = m(),
          c = i ? String(null == i ? void 0 : i.message) : a;
        return c
          ? (0, s.jsx)("p", {
              ref: t,
              id: o,
              className: (0, l.cn)(
                "text-[0.8rem] font-medium text-destructive absolute -bottom-4 text-xs text-rose-600",
                r,
              ),
              ...n,
              children: "Required" === c ? "Obrigat\xf3rio" : c,
            })
          : null;
      });
      j.displayName = "FormMessage";
    },
    85744: function (e, t, r) {
      "use strict";
      function s(e, t, { checkForDefaultPrevented: r = !0 } = {}) {
        return function (s) {
          if ((null == e || e(s), !1 === r || !s.defaultPrevented))
            return null == t ? void 0 : t(s);
        };
      }
      r.d(t, {
        M: function () {
          return s;
        },
      });
    },
    56989: function (e, t, r) {
      "use strict";
      r.d(t, {
        b: function () {
          return a;
        },
      });
      var s = r(2265);
      function a(e, t = []) {
        let r = [],
          a = () => {
            let t = r.map((e) => (0, s.createContext)(e));
            return function (r) {
              let a = (null == r ? void 0 : r[e]) || t;
              return (0, s.useMemo)(
                () => ({ [`__scope${e}`]: { ...r, [e]: a } }),
                [r, a],
              );
            };
          };
        return (
          (a.scopeName = e),
          [
            function (t, a) {
              let n = (0, s.createContext)(a),
                i = r.length;
              function l(t) {
                let { scope: r, children: a, ...l } = t,
                  o = (null == r ? void 0 : r[e][i]) || n,
                  c = (0, s.useMemo)(() => l, Object.values(l));
                return (0, s.createElement)(o.Provider, { value: c }, a);
              }
              return (
                (r = [...r, a]),
                (l.displayName = t + "Provider"),
                [
                  l,
                  function (r, l) {
                    let o = (null == l ? void 0 : l[e][i]) || n,
                      c = (0, s.useContext)(o);
                    if (c) return c;
                    if (void 0 !== a) return a;
                    throw Error(`\`${r}\` must be used within \`${t}\``);
                  },
                ]
              );
            },
            (function (...e) {
              let t = e[0];
              if (1 === e.length) return t;
              let r = () => {
                let r = e.map((e) => ({
                  useScope: e(),
                  scopeName: e.scopeName,
                }));
                return function (e) {
                  let a = r.reduce((t, { useScope: r, scopeName: s }) => {
                    let a = r(e),
                      n = a[`__scope${s}`];
                    return { ...t, ...n };
                  }, {});
                  return (0, s.useMemo)(
                    () => ({ [`__scope${t.scopeName}`]: a }),
                    [a],
                  );
                };
              };
              return (r.scopeName = t.scopeName), r;
            })(a, ...t),
          ]
        );
      }
    },
    16459: function (e, t, r) {
      "use strict";
      r.d(t, {
        W: function () {
          return a;
        },
      });
      var s = r(2265);
      function a(e) {
        let t = (0, s.useRef)(e);
        return (
          (0, s.useEffect)(() => {
            t.current = e;
          }),
          (0, s.useMemo)(
            () =>
              (...e) => {
                var r;
                return null === (r = t.current) || void 0 === r
                  ? void 0
                  : r.call(t, ...e);
              },
            [],
          )
        );
      }
    },
    73763: function (e, t, r) {
      "use strict";
      r.d(t, {
        T: function () {
          return n;
        },
      });
      var s = r(2265),
        a = r(16459);
      function n({ prop: e, defaultProp: t, onChange: r = () => {} }) {
        let [n, i] = (function ({ defaultProp: e, onChange: t }) {
            let r = (0, s.useState)(e),
              [n] = r,
              i = (0, s.useRef)(n),
              l = (0, a.W)(t);
            return (
              (0, s.useEffect)(() => {
                i.current !== n && (l(n), (i.current = n));
              }, [n, i, l]),
              r
            );
          })({ defaultProp: t, onChange: r }),
          l = void 0 !== e,
          o = l ? e : n,
          c = (0, a.W)(r),
          u = (0, s.useCallback)(
            (t) => {
              if (l) {
                let r = "function" == typeof t ? t(e) : t;
                r !== e && c(r);
              } else i(t);
            },
            [l, e, i, c],
          );
        return [o, u];
      }
    },
    51030: function (e, t, r) {
      "use strict";
      r.d(t, {
        b: function () {
          return a;
        },
      });
      var s = r(2265);
      let a = (null == globalThis ? void 0 : globalThis.document)
        ? s.useLayoutEffect
        : () => {};
    },
    85184: function (e, t, r) {
      "use strict";
      r.d(t, {
        D: function () {
          return a;
        },
      });
      var s = r(2265);
      function a(e) {
        let t = (0, s.useRef)({ value: e, previous: e });
        return (0, s.useMemo)(
          () => (
            t.current.value !== e &&
              ((t.current.previous = t.current.value), (t.current.value = e)),
            t.current.previous
          ),
          [e],
        );
      }
    },
    94977: function (e, t, r) {
      "use strict";
      r.d(t, {
        t: function () {
          return n;
        },
      });
      var s = r(2265),
        a = r(51030);
      function n(e) {
        let [t, r] = (0, s.useState)(void 0);
        return (
          (0, a.b)(() => {
            if (e) {
              r({ width: e.offsetWidth, height: e.offsetHeight });
              let t = new ResizeObserver((t) => {
                let s, a;
                if (!Array.isArray(t) || !t.length) return;
                let n = t[0];
                if ("borderBoxSize" in n) {
                  let e = n.borderBoxSize,
                    t = Array.isArray(e) ? e[0] : e;
                  (s = t.inlineSize), (a = t.blockSize);
                } else (s = e.offsetWidth), (a = e.offsetHeight);
                r({ width: s, height: a });
              });
              return t.observe(e, { box: "border-box" }), () => t.unobserve(e);
            }
            r(void 0);
          }, [e]),
          t
        );
      }
    },
  },
  function (e) {
    e.O(
      0,
      [
        8310, 1582, 3190, 6169, 1724, 370, 2254, 2649, 9233, 6685, 8920, 1513,
        1481, 7321, 8962, 2957, 2971, 596, 1744,
      ],
      function () {
        return e((e.s = 12857));
      },
    ),
      (_N_E = e.O());
  },
]);
