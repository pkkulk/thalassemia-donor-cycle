import Link from "next/link";

export const metadata = {
  title: "HemoLink — Intelligent Thalassemia Donor Cycle Platform",
  description:
    "HemoLink unifies donor mapping, appointment orchestration, retention nudges, and operational health signals for blood coordination teams. Manage thalassemia care with clarity, speed, and confidence.",
};

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-tertiary)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      {/* ══════════════════════════════════════════════════════
          TOP NAV
      ══════════════════════════════════════════════════════ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "color-mix(in srgb, var(--color-background-primary) 88%, transparent)",
          borderBottom: "0.5px solid var(--color-border-secondary)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            padding: "0 24px",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--r-xl)",
                background: "linear-gradient(135deg, #F03E5E, #C0193A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(240,62,94,.35)",
              }}
            >
              <svg viewBox="0 0 16 16" style={{ width: 18, height: 18, fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" }}>
                <path d="M8 2C8 2 4 5 4 9a4 4 0 008 0C12 5 8 2 8 2z" />
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Hemo<span style={{ color: "var(--cr-600)" }}>Link</span>
            </span>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { href: "/stats",     label: "Analytics" },
              { href: "/directory", label: "Directory" },
              { href: "/health",    label: "Health" },
            ].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--r-full)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  transition: "all var(--dur-micro)",
                }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              style={{
                marginLeft: 8,
                padding: "8px 20px",
                borderRadius: "var(--r-full)",
                background: "var(--cr-400)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(240,62,94,.3)",
                transition: "all var(--dur-fast)",
              }}
            >
              Open Dashboard →
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ══════════════════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════════════════ */}
        <section
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "48px 24px 32px",
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "var(--r-3xl)",
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)",
              padding: "48px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {/* Background decorations */}
            <div
              style={{
                position: "absolute", right: -80, top: -80,
                width: 280, height: 280, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(240,62,94,.12), transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute", left: -60, bottom: -60,
                width: 240, height: 240, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(74,142,240,.10), transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 48, alignItems: "center", position: "relative" }} className="anim-stagger">
              {/* Left: copy */}
              <div className="hero-enter">
                <span
                  className="anim-fade-up"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 14px",
                    borderRadius: "var(--r-full)",
                    border: "0.5px solid var(--cr-100)",
                    background: "var(--cr-50)",
                    color: "var(--cr-800)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 20,
                  }}
                >
                  🩸 Intelligent Donor Cycle Platform
                </span>

                <h1
                  className="hero-enter-delay"
                  style={{
                    fontSize: 48,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                    color: "var(--color-text-primary)",
                    marginBottom: 20,
                  }}
                >
                  Coordinate thalassemia care with{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, var(--cr-400), var(--cr-600))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    clarity & confidence.
                  </span>
                </h1>

                <p
                  style={{
                    fontSize: 16,
                    lineHeight: 1.7,
                    color: "var(--color-text-secondary)",
                    maxWidth: 520,
                    marginBottom: 32,
                  }}
                >
                  HemoLink unifies donor mapping, appointment orchestration,
                  retention nudges, and operational health signals in one
                  command-ready workspace for your blood coordination team.
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <Link
                    href="/dashboard"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 28px",
                      borderRadius: "var(--r-xl)",
                      background: "var(--cr-400)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "none",
                      boxShadow: "0 4px 16px rgba(240,62,94,.35)",
                      transition: "all var(--dur-fast)",
                    }}
                  >
                    🚀 Launch Control Center
                  </Link>
                  <Link
                    href="/directory"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 24px",
                      borderRadius: "var(--r-xl)",
                      border: "0.5px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      color: "var(--color-text-primary)",
                      fontSize: 14,
                      fontWeight: 500,
                      textDecoration: "none",
                      transition: "all var(--dur-fast)",
                    }}
                  >
                    Explore Directory →
                  </Link>
                </div>

                {/* Trust indicators */}
                <div style={{ display: "flex", gap: 20, marginTop: 28 }}>
                  {[
                    { icon: "🔒", text: "Data Secure" },
                    { icon: "⚡", text: "Real-time Sync" },
                    { icon: "📱", text: "Mobile Ready" },
                  ].map((t) => (
                    <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500 }}>
                      <span>{t.icon}</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Live snapshot widget */}
              <div
                style={{
                  background: "var(--color-background-secondary)",
                  borderRadius: "var(--r-xl)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 16 }}>
                  Live Operations Snapshot
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Active Donors",       value: "247", color: "var(--cr-600)", bg: "var(--cr-50)", border: "var(--cr-100)" },
                    { label: "Appointments",        value: "38",  color: "var(--cb-600)", bg: "var(--cb-50)", border: "var(--cb-100)" },
                    { label: "Completion Rate",     value: "87%", color: "var(--ct-600)", bg: "var(--ct-50)", border: "var(--ct-100)" },
                    { label: "At-Risk Donors",      value: "14",  color: "var(--ca-600)", bg: "var(--ca-50)", border: "var(--ca-100)" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: s.bg,
                        border: `0.5px solid ${s.border}`,
                        borderRadius: "var(--r-lg)",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ fontSize: 11, color: s.color, opacity: 0.8, fontWeight: 500, marginBottom: 6 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: s.color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pipeline preview */}
                <div style={{ marginTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 10 }}>
                    Today&apos;s Pipeline
                  </div>
                  {[
                    { label: "Scheduled", val: 38, color: "var(--cb-400)" },
                    { label: "Accepted",  val: 21, color: "var(--ct-400)" },
                    { label: "Completed", val: 9,  color: "var(--cr-400)" },
                  ].map((p) => (
                    <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 72 }}>{p.label}</div>
                      <div style={{ flex: 1, height: 6, background: "var(--color-border-tertiary)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(p.val / 38) * 100}%`, background: p.color, borderRadius: "var(--r-full)" }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", width: 24, textAlign: "right" }}>{p.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            STATS IMPACT BANNER
        ══════════════════════════════════════════════════════ */}
        <section
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px 32px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, var(--cr-600), var(--cr-400) 60%, #e85580)",
              borderRadius: "var(--r-xl)",
              padding: "32px 48px",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 24,
            }}
          >
            {[
              { value: "247",  label: "Active Donors",    sub: "across 12 districts" },
              { value: "87%",  label: "Completion Rate",  sub: "up 3% this month" },
              { value: "4,200+", label: "Donations Done", sub: "since platform launch" },
              { value: "< 4h", label: "Match Time",       sub: "median donor assignment" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.9)", marginTop: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 2 }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FEATURE CARDS
        ══════════════════════════════════════════════════════ */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 10 }}>
              Platform Capabilities
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--color-text-primary)" }}>
              Everything your team needs
            </h2>
          </div>
          <div className="anim-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              {
                icon: "📅",
                title: "Master Scheduling",
                text: "Track donor arrivals, assignment status, and patient coverage from a single timeline view.",
                accent: "var(--cb-400)",
                bg: "var(--cb-50)",
              },
              {
                icon: "👥",
                title: "Smart Directory",
                text: "Filter and map donors and patients with blood-compatibility-aware workflows that prevent errors.",
                accent: "var(--cr-400)",
                bg: "var(--cr-50)",
              },
              {
                icon: "📊",
                title: "Analytics & Health",
                text: "Monitor supply-demand, completion pipelines, and operational risk in real time with visual charts.",
                accent: "var(--ct-400)",
                bg: "var(--ct-50)",
              },
              {
                icon: "🛡️",
                title: "Reliable Ops",
                text: "Built with fallback data paths so coordinators continue working even during partial outages.",
                accent: "var(--cp-400)",
                bg: "var(--cp-50)",
              },
            ].map((card) => (
              <article
                key={card.title}
              className="card-hover anim-fade-up"
                style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--r-xl)",
                  padding: "24px 22px",
                  boxShadow: "var(--shadow-sm)",
                  cursor: "default",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0,
                    height: 3,
                    background: card.accent,
                    borderRadius: "var(--r-xl) var(--r-xl) 0 0",
                  }}
                />
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--r-lg)",
                    background: card.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    marginBottom: 16,
                  }}
                >
                  {card.icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
                  {card.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════ */}
        <section
          style={{
            background: "var(--color-background-primary)",
            borderTop: "0.5px solid var(--color-border-tertiary)",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            padding: "64px 24px",
          }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 10 }}>
                The Workflow
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--color-text-primary)" }}>
                How HemoLink works
              </h2>
              <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginTop: 10, maxWidth: 520, margin: "10px auto 0" }}>
                From donor registration to completed transfusion — tracked at every step.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, position: "relative" }}>
              {/* Connector lines */}
              <div
                style={{
                  position: "absolute",
                  top: 40,
                  left: "calc(16.66% + 40px)",
                  right: "calc(16.66% + 40px)",
                  height: 1,
                  background: "linear-gradient(90deg, var(--cr-400), var(--cb-400))",
                  zIndex: 0,
                }}
              />
              {[
                {
                  step: "01",
                  icon: "🩸",
                  title: "Donors Register",
                  text: "Donors sign up via mobile app or web, providing blood group, availability, and location. The system auto-creates a profile and starts tracking eligibility.",
                  color: "var(--cr-400)",
                  bg:    "var(--cr-50)",
                },
                {
                  step: "02",
                  icon: "🔗",
                  title: "Admins Map & Schedule",
                  text: "Coordinators match donors to patients by blood compatibility, schedule appointments, and receive alerts for conflicts, risks, and pending actions.",
                  color: "var(--cb-400)",
                  bg:    "var(--cb-50)",
                },
                {
                  step: "03",
                  icon: "💉",
                  title: "Patients Receive Care",
                  text: "Patients get notified of confirmed donors, track appointment statuses in real time, and view their full donation history with cycle summaries.",
                  color: "var(--ct-400)",
                  bg:    "var(--ct-50)",
                },
              ].map((step) => (
                <div key={step.step} style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "var(--r-full)",
                      background: step.bg,
                      border: `2px solid ${step.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      margin: "0 auto 20px",
                      boxShadow: `0 4px 16px ${step.color}33`,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: step.color, textTransform: "uppercase", marginBottom: 8 }}>
                    Step {step.step}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            BLOOD GROUP COVERAGE
        ══════════════════════════════════════════════════════ */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 10 }}>
              Full Coverage
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
              All blood groups supported
            </h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 10 }}>
              Compatibility is automatically enforced — incompatible donor-patient pairs are blocked.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 12 }}>
            {[
              { grp: "A+",  bg: "#F03E5E", donors: 68 },
              { grp: "A−",  bg: "#C0193A", donors: 12 },
              { grp: "B+",  bg: "#4A8EF0", donors: 54 },
              { grp: "B−",  bg: "#1A5CC8", donors: 9  },
              { grp: "O+",  bg: "#22B07A", donors: 80 },
              { grp: "O−",  bg: "#0F7A54", donors: 10 },
              { grp: "AB+", bg: "#7C5CEA", donors: 25 },
              { grp: "AB−", bg: "#4E2EB8", donors: 6  },
            ].map((b) => (
              <div
                key={b.grp}
                style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--r-xl)",
                  padding: "20px 12px",
                  textAlign: "center",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "var(--r-full)",
                    background: b.bg,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    boxShadow: `0 4px 12px ${b.bg}55`,
                  }}
                >
                  {b.grp}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>
                  {b.donors}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  donors
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            TESTIMONIALS / PERSPECTIVES
        ══════════════════════════════════════════════════════ */}
        <section
          style={{
            background: "var(--color-background-primary)",
            borderTop: "0.5px solid var(--color-border-tertiary)",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            padding: "64px 24px",
          }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 10 }}>
                Real Impact
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
                Trusted by coordinators, donors, and patients
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                {
                  quote: "Before HemoLink, we were managing 200+ donors with spreadsheets. Now the action queue tells us exactly what needs attention each morning.",
                  name:  "Priya Mehta",
                  role:  "Blood Bank Coordinator, Mumbai",
                  initials: "PM",
                  bg:    "var(--cr-400)",
                  accent: "var(--cr-600)",
                },
                {
                  quote: "I used to receive calls about my donation schedule. Now the app notifies me automatically and I can confirm or reschedule in one tap.",
                  name:  "Arjun Joshi",
                  role:  "Regular Donor, B+",
                  initials: "AJ",
                  bg:    "var(--cb-400)",
                  accent: "var(--cb-600)",
                },
                {
                  quote: "Seeing my donor's appointment confirmed on the app gives me so much peace of mind. It's made the whole process feel organized and caring.",
                  name:  "Riya Shah",
                  role:  "Thalassemia Patient, Mumbai",
                  initials: "RS",
                  bg:    "var(--ct-400)",
                  accent: "var(--ct-600)",
                },
              ].map((t) => (
                <article
                  key={t.name}
                  style={{
                    background: "var(--color-background-secondary)",
                    border: "0.5px solid var(--color-border-tertiary)",
                    borderRadius: "var(--r-xl)",
                    padding: "28px 24px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 32,
                      color: "var(--color-border-secondary)",
                      lineHeight: 1,
                      marginBottom: 12,
                    }}
                  >
                    &ldquo;
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.75,
                      color: "var(--color-text-secondary)",
                      marginBottom: 24,
                    }}
                  >
                    {t.quote}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--r-full)",
                        background: t.bg,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 1 }}>{t.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PLATFORM PREVIEW CARDS
        ══════════════════════════════════════════════════════ */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 10 }}>
              The Platform
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
              Web Dashboard + Mobile App
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Admin dashboard card */}
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--r-xl)",
                padding: 28,
                boxShadow: "var(--shadow-md)",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--r-lg)", background: "var(--cr-50)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  🖥️
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>Admin Web Dashboard</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Full operational control center</div>
                </div>
              </div>
              {/* Mini dashboard preview */}
              <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--r-lg)", padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                  {[
                    { v: "247", c: "var(--cr-600)", b: "var(--cr-50)" },
                    { v: "38",  c: "var(--cb-600)", b: "var(--cb-50)" },
                    { v: "87%", c: "var(--ct-600)", b: "var(--ct-50)" },
                    { v: "14",  c: "var(--ca-600)", b: "var(--ca-50)" },
                  ].map((s, i) => (
                    <div key={i} style={{ background: s.b, borderRadius: "var(--r-md)", padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 6, background: "var(--color-border-tertiary)", borderRadius: "var(--r-full)", marginBottom: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "72%", background: "var(--cb-400)", borderRadius: "var(--r-full)" }} />
                </div>
                <div style={{ height: 6, background: "var(--color-border-tertiary)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "55%", background: "var(--ct-400)", borderRadius: "var(--r-full)" }} />
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                {["Action Queue", "Schedule Calendar", "Retention Monitor", "Donor Directory", "Analytics"].map((f) => (
                  <span key={f} style={{ padding: "3px 10px", borderRadius: "var(--r-full)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                    {f}
                  </span>
                ))}
              </div>
              <Link
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 20,
                  padding: "10px 20px",
                  borderRadius: "var(--r-md)",
                  background: "var(--cr-400)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Open Dashboard →
              </Link>
            </div>

            {/* Mobile app card */}
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--r-xl)",
                padding: 28,
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--r-lg)", background: "var(--cb-50)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  📱
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>Mobile App (iOS + Android)</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>For donors &amp; patients</div>
                </div>
              </div>
              {/* Mini phone preview */}
              <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--r-lg)", padding: 16 }}>
                {/* Profile card */}
                <div style={{ background: "linear-gradient(135deg, var(--cr-600), var(--cr-400))", borderRadius: "var(--r-lg)", padding: "14px 16px", color: "#fff", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Hi, Arjun 👋</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>B+ Donor · 14 donations · Gold tier</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 10, borderTop: "1px solid rgba(255,255,255,.2)", paddingTop: 10 }}>
                    {[["14","Donations"],["2","Patients"],["Gold","Tier"]].map(([v, l]) => (
                      <div key={l} style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Appointment card */}
                <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--r-md)", padding: "12px 14px", border: "0.5px solid var(--color-border-tertiary)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 8 }}>Next Appointment</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>For Riya Shah</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>B+ · Apr 23 · 10:00 AM</div>
                    </div>
                    <span style={{ padding: "3px 9px", borderRadius: "var(--r-full)", background: "var(--ca-50)", color: "var(--ca-800)", fontSize: 11, fontWeight: 500 }}>Pending</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                {["Donor Dashboard", "Patient Home", "Appointment Mgmt", "Leaderboard", "Achievement Badges"].map((f) => (
                  <span key={f} style={{ padding: "3px 10px", borderRadius: "var(--r-full)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                    {f}
                  </span>
                ))}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 20,
                  padding: "10px 20px",
                  borderRadius: "var(--r-md)",
                  background: "var(--color-background-secondary)",
                  border: "0.5px solid var(--color-border-secondary)",
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                📱 Available via Expo Go
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════════════ */}
        <section
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px 64px",
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--r-xl)",
              padding: "56px 48px",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at 50% -10%, rgba(240,62,94,.08), transparent 55%)",
                pointerEvents: "none",
              }}
            />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 14px",
                borderRadius: "var(--r-full)",
                border: "0.5px solid var(--ct-100)",
                background: "var(--ct-50)",
                color: "var(--ct-800)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              ✓ Ready to deploy
            </span>
            <h2
              style={{
                fontSize: 40,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "var(--color-text-primary)",
                marginBottom: 16,
              }}
            >
              Start coordinating smarter today.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--color-text-secondary)",
                maxWidth: 480,
                margin: "0 auto 32px",
                lineHeight: 1.65,
              }}
            >
              Your team deserves tools that match the importance of the work. HemoLink gives you clarity, speed, and confidence in every donation cycle.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
              <Link
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 36px",
                  borderRadius: "var(--r-xl)",
                  background: "var(--cr-400)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 6px 20px rgba(240,62,94,.4)",
                  transition: "all var(--dur-fast)",
                }}
              >
                🚀 Launch Dashboard
              </Link>
              <Link
                href="/directory"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 28px",
                  borderRadius: "var(--r-xl)",
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "var(--color-background-secondary)",
                  color: "var(--color-text-primary)",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all var(--dur-fast)",
                }}
              >
                Browse Directory →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-primary)",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--r-md)",
                background: "linear-gradient(135deg, #F03E5E, #C0193A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 16 16" style={{ width: 14, height: 14, fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" }}>
                <path d="M8 2C8 2 4 5 4 9a4 4 0 008 0C12 5 8 2 8 2z" />
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
              Hemo<span style={{ color: "var(--cr-600)" }}>Link</span>
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            Thalassemia Donor Cycle Management Platform
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/directory", label: "Directory" },
              { href: "/stats",     label: "Analytics" },
              { href: "/health",    label: "Health" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{ fontSize: 12, color: "var(--color-text-tertiary)", textDecoration: "none" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
