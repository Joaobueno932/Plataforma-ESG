(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [5471],
  {
    17622: function (e, t, r) {
      Promise.resolve().then(r.bind(r, 89476));
    },
    1295: function (e, t, r) {
      "use strict";
      Object.defineProperty(t, "__esModule", { value: !0 }),
        (function (e, t) {
          for (var r in t)
            Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
        })(t, {
          default: function () {
            return c;
          },
          unstable_getImgProps: function () {
            return l;
          },
        });
      let s = r(21024),
        a = r(32301),
        n = r(27873),
        o = r(63222),
        i = s._(r(75033)),
        l = (e) => {
          (0, n.warnOnce)(
            "Warning: unstable_getImgProps() is experimental and may change or be removed at any time. Use at your own risk.",
          );
          let { props: t } = (0, a.getImgProps)(e, {
            defaultLoader: i.default,
            imgConf: {
              deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
              imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
              path: "/_next/image",
              loader: "default",
              dangerouslyAllowSVG: !1,
              unoptimized: !1,
            },
          });
          for (let [e, r] of Object.entries(t)) void 0 === r && delete t[e];
          return { props: t };
        },
        c = o.Image;
    },
    22706: function (e, t, r) {
      "use strict";
      Object.defineProperty(t, "__esModule", { value: !0 }),
        Object.defineProperty(t, "RouterContext", {
          enumerable: !0,
          get: function () {
            return n;
          },
        });
      let s = r(21024),
        a = s._(r(2265)),
        n = a.default.createContext(null);
    },
    89476: function (e, t, r) {
      "use strict";
      r.r(t),
        r.d(t, {
          default: function () {
            return D;
          },
        });
      var s = r(57437),
        a = r(2265),
        n = r(24033),
        o = r(16691),
        i = r.n(o),
        l = r(68230),
        c = r(18962),
        d = r(56387),
        u = r(93378),
        m = r(50176),
        x = r(72117),
        f = r(64992),
        h = r(82778),
        p = r(69761),
        b = r(38110),
        g = r(15429),
        j = r(61865),
        v = () => {
          let e = (0, j.cI)({ resolver: (0, b.F)(h.Iy) }),
            t = (0, n.useRouter)(),
            { keepLogged: r } = (0, c.a)(),
            { sectors: a } = (0, d.M)(),
            o = r ? p.w : p.R;
          return (0, s.jsx)(f.l0, {
            ...e,
            children: (0, s.jsxs)("form", {
              onSubmit: e.handleSubmit((e) => {
                let r = JSON.stringify(e);
                (0, l.setCookie)(null, "".concat("FIEMS", "@progressData"), r, {
                  ...o,
                }),
                  (0, l.setCookie)(null, "".concat("FIEMS", "@progress"), "1", {
                    ...o,
                  }),
                  t.push("/indicators/create-indicator");
              }),
              className: "flex flex-col gap-9",
              noValidate: !0,
              autoComplete: "off",
              children: [
                (0, s.jsx)(f.Wi, {
                  name: "section",
                  control: e.control,
                  render: (e) => {
                    let { field: t } = e;
                    return (0, s.jsxs)(f.xJ, {
                      className: "relative",
                      children: [
                        (0, s.jsxs)(g.Ph, {
                          onValueChange: t.onChange,
                          defaultValue: t.value,
                          children: [
                            (0, s.jsx)(f.NI, {
                              children: (0, s.jsx)(g.i4, {
                                children: (0, s.jsx)(g.ki, {
                                  placeholder: "Selecione um Indicador",
                                }),
                              }),
                            }),
                            (0, s.jsx)(g.Bw, {
                              children: (0, s.jsxs)(g.DI, {
                                className: "overflow-y-auto max-h-80",
                                children: [
                                  (0, s.jsx)(g.n5, {
                                    children: "Selecione um Indicador",
                                  }),
                                  a.map((e) =>
                                    (0, s.jsx)(
                                      g.Ql,
                                      {
                                        value: e.section,
                                        children: e.description,
                                      },
                                      e.section,
                                    ),
                                  ),
                                ],
                              }),
                            }),
                          ],
                        }),
                        (0, s.jsx)(f.zG, {}),
                      ],
                    });
                  },
                }),
                (0, s.jsx)("div", {
                  className: "flex justify-center",
                  children: (0, s.jsx)(u.z, {
                    className: "border-[1px] text-white px-20 mt-[100px]",
                    size: "lg",
                    children: "CADASTRAR INDICADOR",
                  }),
                }),
              ],
            }),
          });
        },
        y = r(48482),
        w = r(93695),
        N = r(36743),
        C = r(95717),
        z = r(43027),
        R = r(2915);
      let A = async (e) => {
        let t = await R.h.post("/sectors", e);
        return t;
      };
      var I = r(89384),
        S = () => {
          let [e, t] = (0, a.useState)(null),
            [r, n] = (0, a.useState)(""),
            [o, i] = (0, a.useState)(""),
            [l, c] = (0, a.useState)(null),
            [d, m] = (0, a.useState)(!1);
          (0, a.useEffect)(() => {
            f();
          }, [e, r, o]);
          let x = (e) => {
              var r;
              if (
                !e.currentTarget.files ||
                (null === (r = e.currentTarget.files) || void 0 === r
                  ? void 0
                  : r.length) <= 0
              )
                return;
              let s = e.currentTarget.files[0];
              return (
                s.size > 104857600 &&
                  c(
                    "O Arquivo selecionado excede o limite de 100mb. Selecione outro",
                  ),
                t(s),
                c(null),
                (e.currentTarget.value = ""),
                null
              );
            },
            f = () => {
              if (r && o && null !== e) return console.log("ok"), m(!0);
              m(!1);
            },
            h = async () => {
              if (!e) return;
              let t = null;
              try {
                t = await (0, z.Sf)(e);
              } catch (e) {
                return (
                  console.error("Erro upload da imagem do caderno", e),
                  (0, I.h)("Falha no upload de imagem", "error")
                );
              }
              if (t)
                try {
                  return (
                    await A({
                      avatar: t.data.filePath,
                      description: r,
                      section: o,
                    }),
                    (0, I.h)("Caderno criado com sucesso!", "success")
                  );
                } catch (e) {
                  return (
                    console.error("Erro no cadastro do caderno", e),
                    (0, I.h)("Falha criar caderno", "error")
                  );
                }
            };
          return (0, s.jsxs)("section", {
            children: [
              (0, s.jsx)("p", {
                className: "text-xl",
                children: "Adicionar foto de capa",
              }),
              (0, s.jsxs)("div", {
                className:
                  " flex justify-center bg-[#1C3D94] text-neutral-01 h-10 rounded-sm transition duration-300 ease-in-outite w-1/2 w-full",
                children: [
                  (0, s.jsx)(N._, {
                    htmlFor: "fileInput",
                    className:
                      "bg-transparent flex items-center justify-center flex-1 font-bold cursor-pointer",
                    children: "Procurar arquivo",
                  }),
                  (0, s.jsx)(w.I, {
                    type: "file",
                    className: "hidden",
                    id: "fileInput",
                    accept: "image/*",
                    onChange: (e) => x(e),
                  }),
                  l,
                ],
              }),
              (0, s.jsx)("p", {
                className: "text-[#6E727A] text-base",
                children:
                  "Dimens\xe3o sugerida: 233x328 | Tamanho m\xe1x. do arquivo: 100mb",
              }),
              (0, s.jsx)("ul", {
                className: "flex flex-wrap items-center gap-3 mt-1",
                children:
                  e &&
                  (0, s.jsx)(C.Z, {
                    fileToRender: e,
                    removeFile: () => t(null),
                  }),
              }),
              (0, s.jsxs)("section", {
                className: "flex mt-6",
                children: [
                  (0, s.jsx)(w.I, {
                    placeholder: "Descri\xe7\xe3o",
                    onChange: (e) => n(e.target.value),
                  }),
                  (0, s.jsx)(w.I, {
                    placeholder: "Setor (A-Z)",
                    onChange: (e) => i(e.target.value),
                    className: "ml-4 w-60",
                  }),
                ],
              }),
              (0, s.jsx)("div", {
                className: "flex justify-center",
                children: (0, s.jsx)(u.z, {
                  className: "border-[1px] text-white px-20 mt-[100px]",
                  size: "lg",
                  disabled: !d,
                  onClick: h,
                  children: "CADASTRAR CADERNO",
                }),
              }),
            ],
          });
        },
        E = r(36820),
        k = r(57973),
        O = (e) => {
          let [t, r] = (0, a.useState)(!1),
            [n, o] = (0, a.useState)(!1),
            i = async () => {
              let t = (0, I.h)("Deletando...", "loading");
              try {
                await (0, k.dc)(e.section),
                  (0, I.b)(t, "Caderno deletado com sucesso!", "success");
              } catch (e) {
                (0, I.b)(t, "Erro ao deletar caderno.", "error");
              }
            };
          return (0, s.jsxs)(s.Fragment, {
            children: [
              t &&
                (0, s.jsxs)(m.u.Root, {
                  closeModal: () => r(!1),
                  className: "".concat(
                    n ? "w-[300px]" : "w-[800px]",
                    " flex flex-col items-center gap-6",
                  ),
                  children: [
                    (0, s.jsx)(m.u.Title, {
                      classes: "text-3xl font-bold text-primary-03 text-center",
                      children:
                        "Tem certeza que deseja deletar esse caderno setorial?",
                    }),
                    (0, s.jsx)(m.u.Content, {
                      className: "max-w-[33.25rem] flex flex-col gap-4",
                      children: (0, s.jsx)("div", {
                        className: "flex flex-col gap-5",
                        children: (0, s.jsx)(u.z, {
                          onClick: () => {
                            r(!1), i();
                          },
                          className:
                            "border border-primary text-primary bg-transparent shadow-sm hover:bg-primary hover:text-white px-6 py-2 rounded-md flex justify-center items-center gap-2",
                          children: "Sim, deletar.",
                        }),
                      }),
                    }),
                  ],
                }),
              (0, s.jsx)("div", {
                className: "flex flex-col gap-2",
                children: (0, s.jsxs)(u.z, {
                  className:
                    "w-48 border-primary text-primary font-bold text-base gap-2",
                  size: "sm",
                  variant: "outline-02",
                  onClick: () => (r(!0), o(!0)),
                  children: [
                    (0, s.jsx)(E.SW4, { size: "1.25rem" }),
                    "Deletar caderno",
                  ],
                }),
              }),
            ],
          });
        };
      function _(e) {
        return e.startsWith("http")
          ? e
          : "".concat("https://esg-fiems-api-stg.sfiec.org.br", "/").concat(e);
      }
      function D() {
        let [e, t] = (0, a.useState)(!1),
          [r, o] = (0, a.useState)(!1),
          { userLogged: f } = (0, c.a)(),
          { sectors: h } = (0, d.M)(),
          p = (0, n.useRouter)(),
          b = h.findIndex((e) => {
            var t;
            return (
              e.section ===
              (null == f
                ? void 0
                : null === (t = f.company) || void 0 === t
                  ? void 0
                  : t.section)
            );
          }),
          g = b >= 0 ? h[b] : { avatar: "", section: "", description: "" },
          j = () => {
            (0, l.setCookie)(null, "oldPath", "/indicators"),
              p.push("/companies/".concat(null == f ? void 0 : f.companyId));
          };
        if (!f)
          return (0, s.jsxs)("section", {
            className:
              "container ml-56 bg-gray-50 h-full flex flex-col space-y-6",
            children: [
              (0, s.jsx)("h3", { children: "Indicadores" }),
              (0, s.jsx)("p", {
                className: "text-3xl text-zinc-500",
                children: "Selecione um de seus cadernos setoriais:",
              }),
              (0, s.jsx)(x.Z.Root, {
                className: "flex justify-center items-center gap-5 p-10",
                children: (0, s.jsxs)(x.Z.Root, {
                  className:
                    "w-[18.75rem] h-[20.5rem] flex flex-col items-center justify-center",
                  children: [
                    (0, s.jsxs)("div", {
                      className:
                        "flex flex-col justify-center items-center space-y-2 h-32",
                      children: [
                        (0, s.jsx)(y.O, {
                          className: "w-36 h-5 bg-zinc-400 rounded-full",
                        }),
                        (0, s.jsx)(y.O, {
                          className: "w-36 h-5 bg-zinc-400 rounded-full",
                        }),
                        (0, s.jsx)(y.O, {
                          className: "w-36 h-5 bg-zinc-400 rounded-full",
                        }),
                      ],
                    }),
                    (0, s.jsx)(y.O, {
                      className: "w-44 h-10 bg-zinc-400 rounded-md",
                    }),
                  ],
                }),
              }),
            ],
          });
        if ("ADMIN" !== f.role)
          return (0, s.jsxs)("section", {
            className: "px-8 ml-56 bg-gray-50 h-full flex flex-col space-y-6",
            children: [
              (0, s.jsx)("h3", { children: "Indicadores" }),
              (0, s.jsx)("p", {
                className: "text-3xl text-zinc-500",
                children: "Selecione um de seus cadernos setoriais:",
              }),
              (0, s.jsxs)(x.Z.Root, {
                className: "flex justify-center items-center gap-5 p-10",
                children: [
                  (0, s.jsxs)(x.Z.Root, {
                    className:
                      "bg-transparente border-none flex flex-col items-center gap-2 max-w-[20.5rem]",
                    children: [
                      (0, s.jsx)("div", {
                        className:
                          "w-[20.5rem] h-[14.5rem] rounded-md overflow-hidden",
                        children: (0, s.jsx)(i(), {
                          src: "".concat(
                            "https://esg-fiems-api-stg.sfiec.org.br",
                            "/static/sectorCovers/caderno_geral.jpeg",
                          ),
                          alt: "imagem do caderno",
                          width: 1e3,
                          height: 1e3,
                          className: "w-full h-full object-cover",
                        }),
                      }),
                      (0, s.jsx)("h4", {
                        className: "text-[#0E3A68] text-xl",
                        children: "CADERNO GERAL",
                      }),
                      (0, s.jsx)("p", {
                        className: "text-sm",
                        children: "Caderno Geral",
                      }),
                      (0, s.jsx)(u.z, {
                        onClick: j,
                        className:
                          "w-44 bg-primary p-2 rounded-md flex items-center justify-center text-white",
                        children: "Ver",
                      }),
                    ],
                  }),
                  (0, s.jsxs)(x.Z.Root, {
                    className:
                      "bg-transparente border-none flex flex-col items-center gap-2 max-w-[20.5rem]",
                    children: [
                      (0, s.jsx)("div", {
                        className:
                          "w-[20.5rem] h-[14.5rem] rounded-md overflow-hidden",
                        children: (0, s.jsx)(i(), {
                          src: _(null == g ? void 0 : g.avatar),
                          alt: "imagem do caderno",
                          width: 1e3,
                          height: 1e3,
                          className: "w-full h-full object-cover",
                        }),
                      }),
                      (0, s.jsxs)("h4", {
                        className: "text-[#0E3A68] text-xl",
                        children: ["CADERNO ", null == g ? void 0 : g.section],
                      }),
                      (0, s.jsx)("p", {
                        className: "text-sm text-center",
                        children: null == g ? void 0 : g.description,
                      }),
                      (0, s.jsx)(u.z, {
                        onClick: j,
                        className:
                          "w-44 bg-primary p-2 rounded-md flex items-center justify-center text-white",
                        children: "Ver",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          });
        let w = h.toSorted((e, t) =>
          "All" === e.section
            ? -1
            : "All" === t.section
              ? 1
              : e.section.localeCompare(t.section),
        );
        return (0, s.jsxs)(s.Fragment, {
          children: [
            e &&
              (0, s.jsxs)(m.u.Root, {
                closeModal: () => t(!1),
                className: "w-[900px] px-20",
                children: [
                  (0, s.jsx)(m.u.Title, {
                    classes: "mb-[4px] font-medium text-3xl",
                    children: "Cadastrar novo indicador",
                  }),
                  (0, s.jsx)(m.u.SubTitle, {
                    className: "text-[#6E727A]",
                    children:
                      "Selecione o caderno que deseja cadastrar novos indicadores",
                  }),
                  (0, s.jsx)(m.u.Content, {
                    className: "mt-8",
                    children: (0, s.jsx)(v, {}),
                  }),
                ],
              }),
            r &&
              (0, s.jsxs)(m.u.Root, {
                closeModal: () => o(!1),
                className: "w-[900px] px-20",
                children: [
                  (0, s.jsx)(m.u.Title, {
                    classes: "mb-[4px] font-medium text-3xl",
                    children: "Cadastrar novo Caderno",
                  }),
                  (0, s.jsx)(m.u.SubTitle, {
                    className: "text-[#6E727A]",
                    children:
                      "Cadastre novos indicadores preenchendo os campos abaixo.",
                  }),
                  (0, s.jsx)(m.u.Content, {
                    className: "mt-8",
                    children: (0, s.jsx)(S, {}),
                  }),
                ],
              }),
            (0, s.jsxs)("div", {
              className:
                "px-6 pb-5 ml-56 bg-gray-50 h-full flex flex-col gap-2",
              children: [
                (0, s.jsxs)("section", {
                  className: "flex flex-col gap-4 px-2",
                  children: [
                    (0, s.jsx)("h3", {
                      className: "title-l",
                      children: "Indicadores",
                    }),
                    (0, s.jsxs)("div", {
                      className: "flex justify-end items-center mb-4",
                      children: [
                        (0, s.jsx)(u.z, {
                          variant: "outline-03",
                          className: "font-[15px] px-[36px] py-[8px] mr-4",
                          size: "free",
                          onClick: () => o(!0),
                          children: "CADASTRAR NOVO CADERNO",
                        }),
                        (0, s.jsx)(u.z, {
                          className:
                            "border-none text-white px-[36px] py-[8px]",
                          onClick: () => t(!0),
                          size: "free",
                          children: "CADASTRAR NOVO INDICADOR",
                        }),
                      ],
                    }),
                  ],
                }),
                (0, s.jsx)("section", {
                  className: "px-2",
                  children: (0, s.jsx)(x.Z.Root, {
                    className:
                      "flex justify-center items-top flex-wrap gap-10 py-[61px]",
                    children: w.map(
                      (e) => (
                        console.log("sector", e),
                        (0, s.jsxs)(
                          x.Z.Root,
                          {
                            className:
                              "bg-transparente border-none flex flex-col  gap-2 max-w-[20.5rem]",
                            children: [
                              (0, s.jsx)("div", {
                                className:
                                  "w-[20.5rem] h-[14.5rem] rounded-md overflow-hidden",
                                children: (0, s.jsx)(i(), {
                                  src: _(e.avatar),
                                  alt: "imagem do caderno",
                                  width: 1e3,
                                  height: 1e3,
                                  className: "w-full h-full object-cover",
                                }),
                              }),
                              (0, s.jsxs)("h4", {
                                className: "text-[#0E3A68] text-xl",
                                children: [
                                  "CADERNO ",
                                  "All" === e.section ? "" : "SETORIAL ",
                                  "All" === e.section ? "GERAL" : e.section,
                                ],
                              }),
                              (0, s.jsx)("p", {
                                className: "text-sm",
                                children: e.description,
                              }),
                              "ADMIN" === f.role &&
                                "All" !== e.section &&
                                (0, s.jsx)(O, { section: e.section }),
                            ],
                          },
                          e.section,
                        )
                      ),
                    ),
                  }),
                }),
              ],
            }),
          ],
        });
      }
    },
    93378: function (e, t, r) {
      "use strict";
      r.d(t, {
        z: function () {
          return c;
        },
      });
      var s = r(57437),
        a = r(2265),
        n = r(67256),
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
        c = a.forwardRef((e, t) => {
          let { className: r, variant: a, size: o, asChild: c = !1, ...d } = e,
            u = c ? n.g7 : "button";
          return (0, s.jsx)(u, {
            className: (0, i.cn)(l({ variant: a, size: o, className: r })),
            ref: t,
            ...d,
          });
        });
      c.displayName = "Button";
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
          return c;
        },
        lX: function () {
          return h;
        },
        xJ: function () {
          return f;
        },
        zG: function () {
          return g;
        },
      });
      var s = r(57437),
        a = r(2265),
        n = r(67256),
        o = r(61865),
        i = r(22703),
        l = r(58020);
      let c = o.RV,
        d = a.createContext({}),
        u = (e) => {
          let { ...t } = e;
          return (0, s.jsx)(d.Provider, {
            value: { name: t.name },
            children: (0, s.jsx)(o.Qr, { ...t }),
          });
        },
        m = () => {
          let e = a.useContext(d),
            t = a.useContext(x),
            { getFieldState: r, formState: s } = (0, o.Gc)(),
            n = r(e.name, s);
          if (!e) throw Error("useFormField should be used within <FormField>");
          let { id: i } = t;
          return {
            id: i,
            name: e.name,
            formItemId: "".concat(i, "-form-item"),
            formDescriptionId: "".concat(i, "-form-item-description"),
            formMessageId: "".concat(i, "-form-item-message"),
            ...n,
          };
        },
        x = a.createContext({}),
        f = a.forwardRef((e, t) => {
          let { className: r, ...n } = e,
            o = a.useId();
          return (0, s.jsx)(x.Provider, {
            value: { id: o },
            children: (0, s.jsx)("div", {
              ref: t,
              className: (0, i.cn)("space-y-2 relative", r),
              ...n,
            }),
          });
        });
      f.displayName = "FormItem";
      let h = a.forwardRef((e, t) => {
        let { className: r, ...a } = e,
          { error: n, formItemId: o } = m();
        return (0, s.jsx)(l._, {
          ref: t,
          className: (0, i.cn)(
            n &&
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
        return (0, s.jsx)(n.g7, {
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
          { formDescriptionId: n } = m();
        return (0, s.jsx)("p", {
          ref: t,
          id: n,
          className: (0, i.cn)("text-[0.8rem] text-muted-foreground", r),
          ...a,
        });
      });
      b.displayName = "FormDescription";
      let g = a.forwardRef((e, t) => {
        let { className: r, children: a, ...n } = e,
          { error: o, formMessageId: l } = m(),
          c = o ? String(null == o ? void 0 : o.message) : a;
        return c
          ? (0, s.jsx)("p", {
              ref: t,
              id: l,
              className: (0, i.cn)(
                "text-[0.8rem] font-medium text-destructive absolute -bottom-4 text-xs text-rose-600",
                r,
              ),
              ...n,
              children: "Required" === c ? "Obrigat\xf3rio" : c,
            })
          : null;
      });
      g.displayName = "FormMessage";
    },
    93695: function (e, t, r) {
      "use strict";
      r.d(t, {
        I: function () {
          return o;
        },
      });
      var s = r(57437),
        a = r(2265),
        n = r(22703);
      let o = a.forwardRef((e, t) => {
        let { className: r, type: a, ...o } = e;
        return (0, s.jsx)("input", {
          type: a,
          className: (0, n.cn)(
            "appearance-none flex h-12 w-full rounded-md border border-input bg-transparent py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 peer input-base body-s  ease-in-out  duration-500 hover:bg-gray-200 px-4 border-gray-200 hover:border-gray-200 outline-none focus:border-primary focus:text-primary focus:bg-white",
            r,
          ),
          ref: t,
          ...o,
        });
      });
      o.displayName = "Input";
    },
    58020: function (e, t, r) {
      "use strict";
      r.d(t, {
        _: function () {
          return c;
        },
      });
      var s = r(57437),
        a = r(2265),
        n = r(36743),
        o = r(96061),
        i = r(22703);
      let l = (0, o.j)(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        ),
        c = a.forwardRef((e, t) => {
          let { className: r, ...a } = e;
          return (0, s.jsx)(n.f, {
            ref: t,
            className: (0, i.cn)(l(), r),
            ...a,
          });
        });
      c.displayName = n.f.displayName;
    },
    15429: function (e, t, r) {
      "use strict";
      r.d(t, {
        Bw: function () {
          return m;
        },
        DI: function () {
          return c;
        },
        Ph: function () {
          return l;
        },
        Ql: function () {
          return f;
        },
        i4: function () {
          return u;
        },
        ki: function () {
          return d;
        },
        n5: function () {
          return x;
        },
      });
      var s = r(57437),
        a = r(2265),
        n = r(69394),
        o = r(93342),
        i = r(22703);
      let l = o.fC,
        c = o.ZA,
        d = o.B4,
        u = a.forwardRef((e, t) => {
          let { className: r, children: a, ...l } = e;
          return (0, s.jsxs)(o.xz, {
            ref: t,
            className: (0, i.cn)(
              "flex w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-primary focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 input-base h-12 text-zinc-500",
              r,
            ),
            ...l,
            children: [
              a,
              (0, s.jsx)(o.JO, {
                asChild: !0,
                children: (0, s.jsx)(n.jnn, {
                  className: "h-4 w-4 opacity-50",
                }),
              }),
            ],
          });
        });
      u.displayName = o.xz.displayName;
      let m = a.forwardRef((e, t) => {
        let { className: r, children: a, position: n = "popper", ...l } = e;
        return (0, s.jsx)(o.h_, {
          children: (0, s.jsx)(o.VY, {
            ref: t,
            className: (0, i.cn)(
              "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-card text-neutral-04 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              "popper" === n &&
                "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
              r,
            ),
            position: n,
            ...l,
            children: (0, s.jsx)(o.l_, {
              className: (0, i.cn)(
                "p-1",
                "popper" === n &&
                  "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
              ),
              children: a,
            }),
          }),
        });
      });
      m.displayName = o.VY.displayName;
      let x = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, s.jsx)(o.__, {
          ref: t,
          className: (0, i.cn)("px-2 text-sm font-semibold py-4 border-b", r),
          ...a,
        });
      });
      x.displayName = o.__.displayName;
      let f = a.forwardRef((e, t) => {
        let { className: r, children: a, ...l } = e;
        return (0, s.jsxs)(o.ck, {
          ref: t,
          className: (0, i.cn)(
            "relative flex w-full cursor-default select-none items-center rounded-sm pl-2 pr-8 text-sm outline-none focus:bg-neutral-01 focus:text-primary-03 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 border-b py-4",
            r,
          ),
          ...l,
          children: [
            (0, s.jsx)("span", {
              className:
                "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
              children: (0, s.jsx)(o.wU, {
                children: (0, s.jsx)(n.nQG, { className: "h-4 w-4" }),
              }),
            }),
            (0, s.jsx)(o.eT, { children: a }),
          ],
        });
      });
      f.displayName = o.ck.displayName;
      let h = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, s.jsx)(o.Z0, {
          ref: t,
          className: (0, i.cn)("-mx-1 my-1 h-px bg-primary-03", r),
          ...a,
        });
      });
      h.displayName = o.Z0.displayName;
    },
    48482: function (e, t, r) {
      "use strict";
      r.d(t, {
        O: function () {
          return n;
        },
      });
      var s = r(57437),
        a = r(22703);
      function n(e) {
        let { className: t, ...r } = e;
        return (0, s.jsx)("div", {
          className: (0, a.cn)("animate-pulse rounded-md bg-primary/10", t),
          ...r,
        });
      }
    },
    95717: function (e, t, r) {
      "use strict";
      var s = r(57437),
        a = r(93378);
      r(2265);
      var n = r(88920);
      t.Z = (e) => {
        let { fileToRender: t, removeFile: r } = e;
        return (0, s.jsxs)("div", {
          className:
            "w-fit h-12 px-4 flex gap-2 justify-between items-center bg-white rounded-2xl shadow-md",
          children: [
            (0, s.jsx)("span", {
              className: "font-medium text-base text-neutral-04",
              children: t.name,
            }),
            (0, s.jsx)(a.z, {
              variant: "ghost",
              className: "border-2 border-black text-black rounded-lg p-1",
              type: "button",
              onClick: r,
              children: (0, s.jsx)(n.Ybf, { size: "24px" }),
            }),
          ],
        });
      };
    },
    72117: function (e, t, r) {
      "use strict";
      r.d(t, {
        Z: function () {
          return n;
        },
      });
      var s = r(57437);
      r(2265);
      var a = r(23986);
      let n = {
        Root: (e) => {
          let { children: t, ...r } = e;
          return (0, s.jsx)("div", {
            ...r,
            className: (0, a.m)("bg-white border-2 rounded-lg", r.className),
            children: t,
          });
        },
        List: (e) => {
          let { children: t, ...r } = e;
          return (0, s.jsx)("ul", {
            ...r,
            className: (0, a.m)("", r.className),
            children: t,
          });
        },
        ListContent: (e) => {
          let { children: t, ...r } = e;
          return (0, s.jsx)("li", {
            ...r,
            className: (0, a.m)(
              "flex justify-between items-center px-4 py-4 border-b-[1px] border-gray-300",
              r.className,
            ),
            children: t,
          });
        },
        ListLabel: (e) => {
          let { children: t, ...r } = e;
          return (0, s.jsx)("ul", {
            ...r,
            className: (0, a.m)("flex items-center px-4", r.className),
            children: t,
          });
        },
      };
    },
    50176: function (e, t, r) {
      "use strict";
      r.d(t, {
        u: function () {
          return i;
        },
      });
      var s = r(57437),
        a = r(2265),
        n = r(23986),
        o = r(41513);
      let i = {
        Root: (e) => {
          let { children: t, closeModal: r, btnClosed: i = !0, ...l } = e,
            c = (0, a.useRef)(null),
            d = (0, a.useCallback)(
              (e) => {
                c.current && "Escape" === e.key && r();
              },
              [r],
            );
          return (
            (0, a.useEffect)(
              () => (
                window.addEventListener("keydown", d),
                c && document.documentElement.classList.add("overflow-hidden"),
                () => {
                  window.removeEventListener("keydown", d),
                    document.documentElement.classList.remove(
                      "overflow-hidden",
                    );
                }
              ),
              [d],
            ),
            (0, s.jsx)("div", {
              className:
                "fixed top-0 left-0 w-full h-screen bg-black/25 z-50 flex items-center justify-center data-[body]:h-screen data-[body]:overflow-hidden",
              id: "root",
              children: (0, s.jsxs)("div", {
                className: (0, n.m)(
                  "relative bg-white h-fit rounded-md shadow-md p-7",
                  l.className,
                ),
                ref: c,
                children: [
                  i &&
                    (0, s.jsx)("button", {
                      className:
                        "absolute top-2 right-2 font-semibold text-base p-2",
                      onClick: r,
                      children: (0, s.jsx)(o.JO, {
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
          return (0, s.jsx)("h1", {
            className: (0, n.m)("text-base", r),
            children: t,
          });
        },
        SubTitle: (e) => {
          let { children: t, className: r } = e;
          return (0, s.jsx)("span", {
            className: (0, n.m)("text-base", r),
            children: t,
          });
        },
        Content: (e) => {
          let { children: t, ...r } = e;
          return (0, s.jsx)("div", {
            className: (0, n.m)("", r.className),
            children: t,
          });
        },
      };
    },
    56387: function (e, t, r) {
      "use strict";
      r.d(t, {
        M: function () {
          return n;
        },
      });
      var s = r(93822),
        a = r(2265);
      let n = () => (0, a.useContext)(s.Q);
    },
    22703: function (e, t, r) {
      "use strict";
      r.d(t, {
        cn: function () {
          return n;
        },
      });
      var s = r(57042),
        a = r(23986);
      function n() {
        for (var e = arguments.length, t = Array(e), r = 0; r < e; r++)
          t[r] = arguments[r];
        return (0, a.m)((0, s.W)(t));
      }
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
          return c;
        },
      });
      var s = r(74578);
      let a = s.z.enum(
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
        n = s.z.enum(["0", "2", "4", "6", "8", "10"], {
          required_error: "*Por favor selecione uma pontua\xe7\xe3o",
        }),
        o = s.z.object({
          section: s.z.string({
            required_error: "*Por favor selecione um Caderno Setorial ",
          }),
        }),
        i = s.z.object({
          title: s.z.string({
            required_error: "*O campo t\xedtulo \xe9 obrigat\xf3rio",
          }),
          category: s.z.string({
            required_error: "*O campo categoria \xe9 obrigat\xf3rio",
          }),
          subcategory: s.z.string({
            required_error: "*O campo subcategoria \xe9 obrigat\xf3rio",
          }),
          description: s.z.string({
            required_error: "*O campo descri\xe7\xe3o \xe9 obrigat\xf3rio",
          }),
          hasMandatory: s.z.boolean().optional(),
        }),
        l = s.z.object({
          description: s.z.string({
            required_error: "*O campo descri\xe7\xe3o \xe9 obrigat\xf3rio",
          }),
          title: a,
          points: n,
          mandatory: s.z.boolean().optional(),
        }),
        c = s.z.object({ answers: s.z.array(l).min(2).max(6) }),
        d = o.merge(i),
        u = l.omit({ points: !0 }).extend({ points: s.z.number() }),
        m = d
          .merge(s.z.object({ answers: s.z.array(u).min(2).max(2) }))
          .omit({ section: !0 });
      d.merge(c),
        s.z.object({
          data: s.z.array(m),
          section: s.z.string({
            required_error: "*Por favor selecione um Caderno Setorial ",
          }),
        });
    },
    16691: function (e, t, r) {
      e.exports = r(1295);
    },
  },
  function (e) {
    e.O(
      0,
      [
        8310, 6115, 2254, 2649, 9233, 3222, 3688, 3342, 8920, 1513, 8962, 2971,
        596, 1744,
      ],
      function () {
        return e((e.s = 17622));
      },
    ),
      (_N_E = e.O());
  },
]);
