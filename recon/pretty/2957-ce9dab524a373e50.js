"use strict";
(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [2957],
  {
    93378: function (e, t, r) {
      r.d(t, {
        z: function () {
          return d;
        },
      });
      var n = r(57437),
        a = r(2265),
        o = r(67256),
        s = r(96061),
        l = r(22703);
      let i = (0, s.j)(
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
          let { className: r, variant: a, size: s, asChild: d = !1, ...c } = e,
            u = d ? o.g7 : "button";
          return (0, n.jsx)(u, {
            className: (0, l.cn)(i({ variant: a, size: s, className: r })),
            ref: t,
            ...c,
          });
        });
      d.displayName = "Button";
    },
    58625: function (e, t, r) {
      r.d(t, {
        X: function () {
          return i;
        },
      });
      var n = r(57437),
        a = r(2265),
        o = r(66062),
        s = r(69394),
        l = r(22703);
      let i = a.forwardRef((e, t) => {
        let { className: r, classIcon: a, ...i } = e;
        return (0, n.jsx)(o.fC, {
          ref: t,
          className: (0, l.cn)(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-white",
            r,
          ),
          ...i,
          children: (0, n.jsx)(o.z$, {
            className: (0, l.cn)(
              "flex items-center justify-center text-current",
            ),
            children: (0, n.jsx)(s.nQG, { className: (0, l.cn)("h-4 w-4", a) }),
          }),
        });
      });
      i.displayName = o.fC.displayName;
    },
    93695: function (e, t, r) {
      r.d(t, {
        I: function () {
          return s;
        },
      });
      var n = r(57437),
        a = r(2265),
        o = r(22703);
      let s = a.forwardRef((e, t) => {
        let { className: r, type: a, ...s } = e;
        return (0, n.jsx)("input", {
          type: a,
          className: (0, o.cn)(
            "appearance-none flex h-12 w-full rounded-md border border-input bg-transparent py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 peer input-base body-s  ease-in-out  duration-500 hover:bg-gray-200 px-4 border-gray-200 hover:border-gray-200 outline-none focus:border-primary focus:text-primary focus:bg-white",
            r,
          ),
          ref: t,
          ...s,
        });
      });
      s.displayName = "Input";
    },
    58020: function (e, t, r) {
      r.d(t, {
        _: function () {
          return d;
        },
      });
      var n = r(57437),
        a = r(2265),
        o = r(36743),
        s = r(96061),
        l = r(22703);
      let i = (0, s.j)(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        ),
        d = a.forwardRef((e, t) => {
          let { className: r, ...a } = e;
          return (0, n.jsx)(o.f, {
            ref: t,
            className: (0, l.cn)(i(), r),
            ...a,
          });
        });
      d.displayName = o.f.displayName;
    },
    97332: function (e, t, r) {
      r.d(t, {
        RM: function () {
          return i;
        },
        SC: function () {
          return c;
        },
        iA: function () {
          return s;
        },
        pj: function () {
          return m;
        },
        ss: function () {
          return u;
        },
        xD: function () {
          return l;
        },
      });
      var n = r(57437),
        a = r(2265),
        o = r(22703);
      let s = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("div", {
          className: "w-full overflow-auto",
          children: (0, n.jsx)("table", {
            ref: t,
            className: (0, o.cn)("w-full caption-bottom text-sm", r),
            ...a,
          }),
        });
      });
      s.displayName = "Table";
      let l = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("thead", {
          ref: t,
          className: (0, o.cn)("[&_tr]:border-b bg-zinc-100", r),
          ...a,
        });
      });
      l.displayName = "TableHeader";
      let i = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("tbody", {
          ref: t,
          className: (0, o.cn)("[&_tr:last-child]:border-0", r),
          ...a,
        });
      });
      i.displayName = "TableBody";
      let d = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("tfoot", {
          ref: t,
          className: (0, o.cn)(
            "bg-primary font-medium text-primary-foreground",
            r,
          ),
          ...a,
        });
      });
      d.displayName = "TableFooter";
      let c = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("tr", {
          ref: t,
          className: (0, o.cn)(
            "border-b transition-colors hover:bg-neutral-01/50 data-[state=selected]:bg-reutral h-14",
            r,
          ),
          ...a,
        });
      });
      c.displayName = "TableRow";
      let u = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("th", {
          ref: t,
          className: (0, o.cn)(
            "h-10 px-2 text-left align-middle font-medium text-neutral-03 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-xs",
            r,
          ),
          ...a,
        });
      });
      u.displayName = "TableHead";
      let m = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("td", {
          ref: t,
          className: (0, o.cn)(
            "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] font-normal text-sm",
            r,
          ),
          ...a,
        });
      });
      m.displayName = "TableCell";
      let f = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("caption", {
          ref: t,
          className: (0, o.cn)("mt-4 text-sm text-muted-foreground", r),
          ...a,
        });
      });
      f.displayName = "TableCaption";
    },
    31578: function (e, t, r) {
      r.d(t, {
        g: function () {
          return s;
        },
      });
      var n = r(57437),
        a = r(2265),
        o = r(22703);
      let s = a.forwardRef((e, t) => {
        let { className: r, ...a } = e;
        return (0, n.jsx)("textarea", {
          className: (0, o.cn)(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            r,
          ),
          ref: t,
          ...a,
        });
      });
      s.displayName = "Textarea";
    },
    59687: function (e, t, r) {
      r.d(t, {
        p: function () {
          return m;
        },
      });
      var n = r(57437),
        a = r(97332),
        o = r(67303),
        s = r(41513),
        l = r(88920),
        i = r(89384);
      function d(e) {
        return "fileId" in e;
      }
      function c(e) {
        return !d(e) && "fileType" in e;
      }
      function u(e) {
        if (e.startsWith("http")) return e;
      }
      let m = (e) => {
        let { files: t, remove: r } = e,
          { removeFile: m } = (0, o.u)(),
          f = (e) => {
            let n = t[e];
            if (c(n)) return;
            if (!d(n)) {
              r(e);
              return;
            }
            let a = n.file.companyId + "/" + n.file.name,
              o = encodeURIComponent(a);
            m(n.id, o);
          };
        return (0, n.jsxs)(a.iA, {
          children: [
            (0, n.jsx)(a.xD, {
              children: (0, n.jsxs)(a.SC, {
                className: "w-full",
                children: [
                  (0, n.jsx)(a.ss, {
                    className: "pl-4 w-[85%]",
                    children: "Anexo",
                  }),
                  (0, n.jsx)(a.ss, {
                    className: "text-center flex-1",
                    children: "A\xe7\xf5es",
                  }),
                ],
              }),
            }),
            (0, n.jsxs)(a.RM, {
              children: [
                0 === t.length &&
                  (0, n.jsx)(a.SC, {
                    children: (0, n.jsx)(a.pj, {
                      colSpan: 2,
                      className: "text-center",
                      children: "Nenhum arquivo anexado",
                    }),
                  }),
                t.length > 0 &&
                  t.map((e, t) =>
                    (0, n.jsxs)(
                      a.SC,
                      {
                        children: [
                          (0, n.jsx)(a.pj, {
                            children:
                              !c(e) && (c(e) || "file" in e)
                                ? e.file.name
                                : e.name,
                          }),
                          (0, n.jsxs)(a.pj, {
                            className: "flex gap-2 align-middle justify-center",
                            children: [
                              (d(e) || c(e)) &&
                                (0, n.jsx)("a", {
                                  href: d(e) ? u(e.file.url) : u(e.url),
                                  download: d(e) ? e.file.name : e.name,
                                  target: "_blank",
                                  className:
                                    "inline-flex items-center justify-center rounded-md text-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-neutral-02 disabled:text-neutral-01 bg-primary-03 hover:bg-primary-03/90 shadow-sm text-white h-9 px-4 py-2 cursor-pointer",
                                  onClick: () =>
                                    (function (e) {
                                      let t = d(e) ? e.file.url : e.url,
                                        r = d(e) ? e.file.name : e.name,
                                        n = localStorage.getItem("jwt");
                                      if (t.startsWith("http") || null === n)
                                        return;
                                      let a = new Headers();
                                      a.append(
                                        "Authorization",
                                        "Bearer ".concat(n),
                                      );
                                      let o = document.createElement("a");
                                      document.body.appendChild(o),
                                        fetch(
                                          ""
                                            .concat(
                                              "https://esg-fiems-api-stg.sfiec.org.br",
                                              "/",
                                            )
                                            .concat(t),
                                          { headers: a },
                                        )
                                          .then((e) =>
                                            200 !== e.status
                                              ? e.json()
                                              : e.blob(),
                                          )
                                          .then((e) => {
                                            if (!(e instanceof Blob)) throw e;
                                            let t =
                                              window.URL.createObjectURL(e);
                                            (o.href = t),
                                              (o.download = r),
                                              o.click(),
                                              window.URL.revokeObjectURL(t);
                                          })
                                          .catch((e) => {
                                            var t;
                                            console.error(e),
                                              (0, i.h)(
                                                "Erro ao baixar arquivo - " +
                                                  (null !==
                                                    (t =
                                                      null == e
                                                        ? void 0
                                                        : e.message) &&
                                                  void 0 !== t
                                                    ? t
                                                    : ""),
                                                "error",
                                              );
                                          })
                                          .finally(() => {
                                            document.body.removeChild(o);
                                          });
                                    })(e),
                                  children: (0, n.jsx)(s.JO, {
                                    icon: "basil:download-solid",
                                  }),
                                }),
                              !c(e) &&
                                (0, n.jsx)("button", {
                                  className:
                                    "inline-flex items-center justify-center rounded-md text-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-neutral-02 disabled:text-neutral-01 bg-[#c93224] hover:bg-[#c93224e0] shadow-sm text-white h-9 px-4 py-2 cursor-pointer",
                                  type: "button",
                                  onClick: () => f(t),
                                  children: (0, n.jsx)(l.Ybf, { size: "20px" }),
                                }),
                            ],
                          }),
                        ],
                      },
                      t,
                    ),
                  ),
              ],
            }),
          ],
        });
      };
    },
    96882: function (e, t, r) {
      r.d(t, {
        ED: function () {
          return f;
        },
        Fz: function () {
          return i;
        },
        Rk: function () {
          return m;
        },
        Vd: function () {
          return d;
        },
        dX: function () {
          return u;
        },
        rb: function () {
          return c;
        },
      });
      var n = r(57437);
      r(2265);
      var a = r(22703),
        o = r(96061),
        s = r(51678);
      let l = (0, o.j)(
          "relative px-6 py-6 pt-8 rounded-2xl h-fit min-h-[15rem] text-white flex flex-col gap-4 items-center",
          {
            variants: {
              variant: {
                default: "bg-card",
                Conforme: "bg-card-according",
                Iniciante: "bg-card-beginner",
                Sensibilizada: "bg-card-sensitized",
                Consciente: "bg-card-conscious",
                Nao_conforme: "bg-card-not-compliant",
                Engajado: "bg-violet-400",
                disabled: "bg-neutral-02",
              },
              size: {
                default: "w-[13.5rem]",
                md: "w-[13.5rem]",
                lg: "w-[14.5rem]",
              },
            },
            defaultVariants: { variant: "default", size: "default" },
          },
        ),
        i = (e) => {
          let { variant: t, children: r } = e;
          return (0, n.jsx)("div", {
            className: (0, a.cn)(l({ variant: t })),
            children: r,
          });
        },
        d = (e) => {
          let { children: t } = e;
          return (0, n.jsx)("h3", {
            className: "font-bold text-xl",
            children: t,
          });
        },
        c = (e) => {
          let { children: t } = e;
          return (0, n.jsxs)("button", {
            className:
              "flex justify-center ityems-center p-2 text-neutral bg-neutral-01 rounded-lg",
            children: [t, " pts"],
          });
        },
        u = (e) => {
          let { children: t } = e;
          return (0, n.jsx)("p", {
            className: "text-center w-52 font-normal leading-7",
            children: t,
          });
        },
        m = () =>
          (0, n.jsx)("span", {
            className: "text-sm font-bold",
            children: "Obrigat\xf3ria*",
          }),
        f = () =>
          (0, n.jsx)("div", {
            className: "absolute top-0 right-0",
            children: (0, n.jsx)(s.iLT, {
              size: "2rem",
              className: "fill-[#19FB14]",
            }),
          });
    },
    50176: function (e, t, r) {
      r.d(t, {
        u: function () {
          return l;
        },
      });
      var n = r(57437),
        a = r(2265),
        o = r(23986),
        s = r(41513);
      let l = {
        Root: (e) => {
          let { children: t, closeModal: r, btnClosed: l = !0, ...i } = e,
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
                className: (0, o.m)(
                  "relative bg-white h-fit rounded-md shadow-md p-7",
                  i.className,
                ),
                ref: d,
                children: [
                  l &&
                    (0, n.jsx)("button", {
                      className:
                        "absolute top-2 right-2 font-semibold text-base p-2",
                      onClick: r,
                      children: (0, n.jsx)(s.JO, {
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
            className: (0, o.m)("text-base", r),
            children: t,
          });
        },
        SubTitle: (e) => {
          let { children: t, className: r } = e;
          return (0, n.jsx)("span", {
            className: (0, o.m)("text-base", r),
            children: t,
          });
        },
        Content: (e) => {
          let { children: t, ...r } = e;
          return (0, n.jsx)("div", {
            className: (0, o.m)("", r.className),
            children: t,
          });
        },
      };
    },
    22503: function (e, t, r) {
      r.d(t, {
        Z: function () {
          return g;
        },
      });
      var n = r(57437),
        a = r(93378),
        o = r(2265),
        s = r(56387),
        l = r(18962),
        i = r(50176),
        d = r(36468),
        c = r(39830),
        u = r(26058),
        m = r(88920),
        f = r(21481),
        x = (e) => {
          let { changeSelect: t, data: r } = e,
            [a, s] = (0, o.useState)([]),
            [l, i] = (0, o.useState)(!1),
            d = (e) => {
              if ((l || i(!0), e.length <= 0)) s([]), i(!1);
              else {
                let t = r.filter((t) =>
                  t.name.toLowerCase().includes(e.toLowerCase()),
                );
                s([...t]);
              }
            },
            c = (0, o.useRef)(null),
            x = (0, o.useRef)(null);
          (0, o.useEffect)(() => {
            let e = (e) => {
              x.current && e.target && (x.current.contains(e.target) || i(!1));
            };
            return (
              window.addEventListener("mousedown", e),
              () => {
                document.documentElement.classList.remove("overflow-hidden"),
                  window.removeEventListener("mousedown", e);
              }
            );
          }, []);
          let [b, p] = (0, o.useState)([]),
            h = async () => {
              let e = await (0, u.Lz)();
              p(e);
            };
          return (
            (0, o.useEffect)(() => {
              h();
            }, []),
            (0, n.jsxs)("div", {
              className: "flex flex-col relative",
              children: [
                (0, n.jsxs)("div", {
                  className:
                    "flex items-center gap-2 w-full h-14 rounded-lg border-1 px-4 bg-neutral-01 shadow-sm",
                  children: [
                    (0, n.jsx)("button", {
                      onClick: () => {
                        var e;
                        return d(
                          null === (e = c.current) || void 0 === e
                            ? void 0
                            : e.value,
                        );
                      },
                      children: (0, n.jsx)(m.jRj, {
                        size: "1.25rem",
                        className: "stroke-neutral-03",
                      }),
                    }),
                    (0, n.jsx)(f.Z, {
                      style: { width: "1000px" },
                      placeholder: "Pesquisar arquivo",
                      data: b,
                      dataKey: "id",
                      textField: "name",
                      onChange: (e) => {
                        (null == e ? void 0 : e.id) && t(e);
                      },
                    }),
                  ],
                }),
                l &&
                  (0, n.jsx)("div", {
                    className:
                      "flex flex-col w-full overflow-y-auto max-h-[170px] absolute top-14 ".concat(
                        l && "shadow-md",
                      ),
                    ref: x,
                    children: a.map((e) =>
                      (0, n.jsx)(
                        "button",
                        {
                          className:
                            "bg p-4 rounded border-[1px] border-neutral-02 hover:bg-neutral-01 text-start bg-white",
                          onClick: () => (t(e), i(!1)),
                          children: e.name,
                        },
                        e.id,
                      ),
                    ),
                  }),
              ],
            })
          );
        },
        b = r(43027),
        p = r(89384),
        h = r(92164),
        g = (e) => {
          let [t, r] = (0, o.useState)(null),
            [m, f] = (0, o.useState)(!1),
            [g, v] = (0, o.useState)(!1),
            [w, y] = (0, o.useState)(null),
            [j, N] = (0, o.useState)(null),
            {
              currentPage: C,
              numberOfPages: E,
              handleNextPageCompanies: k,
              handlePreviousPageCompanies: R,
              removeCompany: A,
            } = (0, s.M)(),
            { userLogged: S } = (0, l.a)();
          (0, o.useEffect)(() => {
            console.log(w);
          }, [w]);
          let z = async () => {
            var t;
            console.log("companySelected", w), console.log(w);
            try {
              await (0, b.bD)(
                { filesToAdd: [(null == w ? void 0 : w.id) || ""] },
                e.questionReportId,
              ),
                setTimeout(() => {
                  window.location.reload();
                }, 100),
                (0, p.h)("Arquivo adicionado na quest\xe3o", "success");
            } catch (e) {
              e instanceof h.d7
                ? (0, p.h)(
                    "Ocorreu um erro ao fazer upload do arquivo: ".concat(
                      null === (t = e.response) || void 0 === t
                        ? void 0
                        : t.data.message,
                    ),
                    "error",
                  )
                : (0, p.h)("Erro ao fazer upload do arquivo", "error");
            }
            r(null);
          };
          return (
            (0, o.useEffect)(() => {
              (async () => {
                let e = await (0, u.Lz)();
                console.log("data", e), N(e);
              })();
            }, []),
            (0, n.jsxs)(n.Fragment, {
              children: [
                t &&
                  (0, n.jsxs)(i.u.Root, {
                    closeModal: () => r(null),
                    className: "w-[987px]",
                    children: [
                      (0, n.jsx)(i.u.Title, {
                        classes: "font-semibold text-2xl text-neutral",
                        children: "Upload GED",
                      }),
                      (0, n.jsx)(i.u.SubTitle, {
                        className: "text-base text-neutral-03",
                        children:
                          "Pesquise pelo nome do arquivo da empresa que deseja adicionar a essa pergunta, no campo de pesquisa abaixo.",
                      }),
                      (0, n.jsxs)(i.u.Content, {
                        className: "mt-5 flex flex-col",
                        children: [
                          (0, n.jsx)(x, {
                            changeSelect: (e) => {
                              y(e);
                            },
                            data: j,
                          }),
                          (0, n.jsxs)("div", {
                            className: "space-y-3 mt-14 mb-40",
                            children: [
                              (0, n.jsxs)("p", {
                                className:
                                  "flex items-center gap-1 text-neutral-03",
                                children: [
                                  (0, n.jsxs)("span", {
                                    className:
                                      "flex items-center gap-1 text-base text-neutral font-semibold",
                                    children: [
                                      (0, n.jsx)(d.SZZ, {}),
                                      "Importante:",
                                    ],
                                  }),
                                  " ",
                                  "Selecione um arquivo por vez.",
                                ],
                              }),
                              (0, n.jsx)("h4", {
                                className:
                                  "font-semibold text-neutral text-base",
                                children: "Arquivo selecionado:",
                              }),
                              w
                                ? (0, n.jsxs)(
                                    "div",
                                    {
                                      className:
                                        "w-fit h-12 px-4 flex gap-2 justify-between items-center bg-white rounded-2xl shadow-md",
                                      children: [
                                        (0, n.jsx)("span", {
                                          className:
                                            "font-medium text-base text-neutral-04",
                                          children: w.name,
                                        }),
                                        (0, n.jsx)(a.z, {
                                          className:
                                            "border-none bg-transparent shadow-transparent hover:bg-transparent text-black rounded-lg p-1",
                                          type: "button",
                                          onClick: () => y(null),
                                          children: "x",
                                        }),
                                      ],
                                    },
                                    w.id,
                                  )
                                : (0, n.jsx)("span", {
                                    className: "text-neutral-03",
                                    children: "Nenhum arquivo selecionado.",
                                  }),
                            ],
                          }),
                          (0, n.jsx)(a.z, {
                            size: "lg",
                            variant: "edit" === t ? "default" : "error",
                            className: "text-sm self-center w-[390px] ".concat(
                              "edit" === t
                                ? "disabled:bg-primary-03/60"
                                : "disabled:bg-semantic-error/60",
                            ),
                            type: "button",
                            onClick: z,
                            disabled: !w,
                            children: "ENVIAR ARQUIVO",
                          }),
                        ],
                      }),
                    ],
                  }),
                m &&
                  (0, n.jsxs)(i.u.Root, {
                    closeModal: () => f(!1),
                    className: "w-fit flex flex-col items-center",
                    children: [
                      (0, n.jsx)(c.JO, {
                        icon: "ph:x-circle-bold",
                        className: "text-semantic-error w-32 h-32",
                      }),
                      (0, n.jsx)(i.u.Title, {
                        classes: "text-2xl text-medium",
                        children: "Exclus\xe3o de conta",
                      }),
                      (0, n.jsx)("p", {
                        className:
                          "w-[460px] text-center text-neutral-03 text-xl",
                        children:
                          "Tem certeza de que deseja excluir permanentemente essa empresa? Esta a\xe7\xe3o n\xe3o pode ser desfeita e acarretar\xe1 na exclus\xe3o dos dados compartilhados com essa aplica\xe7\xe3o.",
                      }),
                      (0, n.jsxs)(i.u.Content, {
                        className: "flex gap-4 mt-16",
                        children: [
                          (0, n.jsx)(a.z, {
                            className: "w-64 text-sm",
                            variant: "primary-main",
                            size: "lg",
                            onClick: () => f(!1),
                            children: "CANCELAR",
                          }),
                          (0, n.jsx)(a.z, {
                            className: "w-64 text-sm",
                            variant: "error",
                            size: "lg",
                            onClick: () => {
                              A(w.id);
                            },
                            children: "DELETAR CONTA",
                          }),
                        ],
                      }),
                    ],
                  }),
                g &&
                  (0, n.jsxs)(i.u.Root, {
                    closeModal: () => v(!1),
                    className: "flex flex-col w-[1080px] px-[70px] py-10",
                    children: [
                      (0, n.jsx)(i.u.Title, {
                        classes: "text-2xl text-medium",
                        children: "Editar empresa",
                      }),
                      (0, n.jsx)(i.u.SubTitle, {
                        children:
                          "Clique em “Habilitar edi\xe7\xe3o” para editar suas informa\xe7\xf5es. Ap\xf3s editar, clique em “Salvar altera\xe7\xf5es” e sua edi\xe7\xe3o estar\xe1 salva!",
                      }),
                    ],
                  }),
                (0, n.jsx)("section", {
                  className: "px-2",
                  children: (0, n.jsxs)("button", {
                    onClick: () => (r("edit"), y(null)),
                    className:
                      "bg-[#0E3A68] w-[280px] text-white h-[40px] flex items-center justify-center rounded-sm",
                    type: "button",
                    children: [
                      "UPLOAD GED",
                      (0, n.jsx)(c.JO, {
                        icon: "basil:upload-solid",
                        width: 24,
                        style: { marginLeft: "8px" },
                      }),
                    ],
                  }),
                }),
              ],
            })
          );
        };
    },
    56387: function (e, t, r) {
      r.d(t, {
        M: function () {
          return o;
        },
      });
      var n = r(93822),
        a = r(2265);
      let o = () => (0, a.useContext)(n.Q);
    },
    67303: function (e, t, r) {
      r.d(t, {
        u: function () {
          return o;
        },
      });
      var n = r(17746),
        a = r(2265);
      let o = () => (0, a.useContext)(n.H);
    },
    22703: function (e, t, r) {
      r.d(t, {
        cn: function () {
          return o;
        },
      });
      var n = r(57042),
        a = r(23986);
      function o() {
        for (var e = arguments.length, t = Array(e), r = 0; r < e; r++)
          t[r] = arguments[r];
        return (0, a.m)((0, n.W)(t));
      }
    },
    13012: function (e, t, r) {
      r.d(t, {
        $l: function () {
          return o;
        },
        HY: function () {
          return n;
        },
        RU: function () {
          return a;
        },
      });
      let n = {
          Engajado: "ENGAJADA",
          Iniciante: "INICIANTE",
          Sensibilizada: "SENSIBILIZADA",
          Consciente: "CONSCIENTE",
          Nao_conforme: "N\xc3O CONFORME",
          Conforme: "CONFORME",
        },
        a = {
          Pending: "Aguardando resposta",
          PendingValidationByManager: "Para an\xe1lise do Gestor",
          ApprovedByManager: "Aprovado pelo Gestor",
          ApprovedByConsultor: "Aprovado pelo Consultor",
          ApprovedByAuditor: "Aprovado pelo Auditor",
          RejectedByManager: "Rejeitado pelo Gestor",
          RejectedByConsultor: "Rejeitado pelo Consultor",
          RejectedByAuditor: "Rejeitado pelo Auditor",
          Auditing: "Em auditoria",
          PendingRevision: "Aguardando complemento",
          Approved: "Aprovado",
          Rejected: "Rejeitado",
          Supervising: "Em supervis\xe3o",
        },
        o = {
          Pending: "bg-neutral-02 hover:bg-neutral-02/80",
          PendingValidationByManager:
            "bg-semantic-alert hover:bg-semantic-alert/80",
          ApprovedByManager: "bg-semantic-link hover:bg-semantic-link/80",
          ApprovedByConsultor: "bg-[#00aeff] hover:bg-[#00aeff]/80",
          RejectedByManager: "  hover:bg-semantic-error/80",
          RejectedByConsultor: "bg-semantic-error hover:bg-semantic-error/80",
          Auditing: "bg-primary-02 hover:bg-primary-02/80",
          PendingRevision: "bg-rose-500 hover:bg-rose-500/80",
          Approved: "bg-secondary-02 hover:bg-secondary-02/80",
          Rejected: "bg-red-800 hover:bg-red-800/80 text-white",
        };
    },
    38324: function (e, t, r) {
      r.d(t, {
        CN: function () {
          return i;
        },
        KL: function () {
          return o;
        },
        co: function () {
          return s;
        },
        jv: function () {
          return a;
        },
        lv: function () {
          return n;
        },
        p9: function () {
          return l;
        },
      });
      let n = (e) => {
          let t = new Date(e),
            r = t.getDate(),
            n = [
              "Jan",
              "Fev",
              "Mar",
              "Abr",
              "Mai",
              "Jun",
              "Jul",
              "Ago",
              "Set",
              "Out",
              "Nov",
              "Dez",
            ][t.getMonth()],
            a = t.getFullYear();
          return "".concat(n, " ").concat(r, ", ").concat(a);
        },
        a = (e) => {
          let t = new Date(e),
            r = t.getDate().toString().padStart(2, "0"),
            n = (t.getMonth() + 1).toString().padStart(2, "0"),
            a = t.getFullYear();
          return "".concat(n, "/").concat(r, "/").concat(a);
        },
        o = (e) => (e && e.length > 0 ? e[0].name : "ainda n\xe3o registrado"),
        s = (e) =>
          [
            "Nao_conforme",
            "Iniciante",
            "Sensibilizada",
            "Consciente",
            "Engajado",
            "Conforme",
          ].indexOf(e),
        l = function () {
          let e =
            arguments.length > 0 && void 0 !== arguments[0]
              ? arguments[0]
              : "Ol\xe1, gostaria de falar com a Central de Relacionamento do Sistema ".concat(
                  "FIEMS",
                );
          return "https://api.whatsapp.com/send?phone=55"
            .concat("6733899080", "&text=")
            .concat(e, ".");
        },
        i = (e) => {
          if (e.length < 10 || e.length > 11) return e;
          let t = 10 === e.length ? 4 : 5;
          return (
            "" +
            ("(".concat(e.substring(0, 2), ") ") +
              "".concat(e.substring(2, 2 + t), "-") +
              e.substring(2 + t))
          );
        };
    },
    66062: function (e, t, r) {
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
        o = r(42210),
        s = r(56989),
        l = r(85744),
        i = r(73763),
        d = r(85184),
        c = r(94977),
        u = r(85606),
        m = r(9381);
      let f = "Checkbox",
        [x, b] = (0, s.b)(f),
        [p, h] = x(f),
        g = (0, a.forwardRef)((e, t) => {
          let {
              __scopeCheckbox: r,
              name: s,
              checked: d,
              defaultChecked: c,
              required: u,
              disabled: f,
              value: x = "on",
              onCheckedChange: b,
              ...h
            } = e,
            [g, v] = (0, a.useState)(null),
            N = (0, o.e)(t, (e) => v(e)),
            C = (0, a.useRef)(!1),
            E = !g || !!g.closest("form"),
            [k = !1, R] = (0, i.T)({ prop: d, defaultProp: c, onChange: b }),
            A = (0, a.useRef)(k);
          return (
            (0, a.useEffect)(() => {
              let e = null == g ? void 0 : g.form;
              if (e) {
                let t = () => R(A.current);
                return (
                  e.addEventListener("reset", t),
                  () => e.removeEventListener("reset", t)
                );
              }
            }, [g, R]),
            (0, a.createElement)(
              p,
              { scope: r, state: k, disabled: f },
              (0, a.createElement)(
                m.WV.button,
                (0, n.Z)(
                  {
                    type: "button",
                    role: "checkbox",
                    "aria-checked": y(k) ? "mixed" : k,
                    "aria-required": u,
                    "data-state": j(k),
                    "data-disabled": f ? "" : void 0,
                    disabled: f,
                    value: x,
                  },
                  h,
                  {
                    ref: N,
                    onKeyDown: (0, l.M)(e.onKeyDown, (e) => {
                      "Enter" === e.key && e.preventDefault();
                    }),
                    onClick: (0, l.M)(e.onClick, (e) => {
                      R((e) => !!y(e) || !e),
                        E &&
                          ((C.current = e.isPropagationStopped()),
                          C.current || e.stopPropagation());
                    }),
                  },
                ),
              ),
              E &&
                (0, a.createElement)(w, {
                  control: g,
                  bubbles: !C.current,
                  name: s,
                  value: x,
                  checked: k,
                  required: u,
                  disabled: f,
                  style: { transform: "translateX(-100%)" },
                }),
            )
          );
        }),
        v = (0, a.forwardRef)((e, t) => {
          let { __scopeCheckbox: r, forceMount: o, ...s } = e,
            l = h("CheckboxIndicator", r);
          return (0, a.createElement)(
            u.z,
            { present: o || y(l.state) || !0 === l.state },
            (0, a.createElement)(
              m.WV.span,
              (0, n.Z)(
                {
                  "data-state": j(l.state),
                  "data-disabled": l.disabled ? "" : void 0,
                },
                s,
                { ref: t, style: { pointerEvents: "none", ...e.style } },
              ),
            ),
          );
        }),
        w = (e) => {
          let { control: t, checked: r, bubbles: o = !0, ...s } = e,
            l = (0, a.useRef)(null),
            i = (0, d.D)(r),
            u = (0, c.t)(t);
          return (
            (0, a.useEffect)(() => {
              let e = l.current,
                t = window.HTMLInputElement.prototype,
                n = Object.getOwnPropertyDescriptor(t, "checked"),
                a = n.set;
              if (i !== r && a) {
                let t = new Event("click", { bubbles: o });
                (e.indeterminate = y(r)),
                  a.call(e, !y(r) && r),
                  e.dispatchEvent(t);
              }
            }, [i, r, o]),
            (0, a.createElement)(
              "input",
              (0, n.Z)(
                {
                  type: "checkbox",
                  "aria-hidden": !0,
                  defaultChecked: !y(r) && r,
                },
                s,
                {
                  tabIndex: -1,
                  ref: l,
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
      function y(e) {
        return "indeterminate" === e;
      }
      function j(e) {
        return y(e) ? "indeterminate" : e ? "checked" : "unchecked";
      }
      let N = g,
        C = v;
    },
  },
]);
