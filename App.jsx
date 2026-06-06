import { useState, useRef, useEffect } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const PAYSTACK_KEY = "pk_live_711536bf0ccb9506b6ec032ff7297a60b6978b36";
const CONTACT_EMAIL = "claritycareerai@gmail.com";
const OWNER_NAME = "Goodluck Meshack Akoh";
const PRICE_MONTHLY = 8;
const PRICE_ANNUAL = 55;
const FREE_DAILY_LIMIT = 10;

// ─── Storage ─────────────────────────────────────────────────────────────────
const store = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── Paystack ────────────────────────────────────────────────────────────────
function initPaystack({ email, amount, plan, onSuccess, onClose }) {
  const load = () => new Promise(res => {
    if (window.PaystackPop) return res();
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = res;
    document.head.appendChild(s);
  });
  load().then(() => {
    const h = window.PaystackPop.setup({
      key: PAYSTACK_KEY, email, amount: amount * 100, currency: "USD",
      channels: ["card"],
      metadata: { plan },
      callback: onSuccess,
      onClose,
    });
    h.openIframe();
  });
}

// ─── AI Call ─────────────────────────────────────────────────────────────────
async function callAI(messages, system) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Error ${res.status}`); }
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "Something went wrong.";
}

// ─── Templates ───────────────────────────────────────────────────────────────
const TEMPLATES = {
  "Price Inquiry": [
    "Thank you for your interest! The price for [product] is [price]. This includes [details]. Would you like to place an order?",
    "Hello! [Product] is currently [price]. We offer quality products and fast delivery. Shall I reserve one for you?",
    "Hi! Our [product] goes for [price]. We have it available now. How many would you like?",
  ],
  "Payment Follow Up": [
    "Hello! Just checking in regarding your order. Kindly make payment to [account] so we can process it immediately.",
    "Hi! Your order is ready and waiting. Please complete payment at your earliest convenience so we can dispatch it.",
    "Good day! We noticed your payment is pending. Kindly send to [account]. Let us know once done!",
  ],
  "Delivery Update": [
    "Great news! Your order has been dispatched and is on its way. Expected delivery: [date]. We'll keep you updated!",
    "Hello! Your package is out for delivery today. Our rider will contact you shortly. Please keep your phone accessible.",
    "Hi! Your order is ready. Please confirm your delivery address: [address] so we can send it right away.",
  ],
  "Out of Stock": [
    "Hello! Unfortunately [product] is currently out of stock. We expect restocking by [date]. Shall I notify you when it arrives?",
    "Hi! We've sold out of [product] but more is coming soon. Would you like to be on our waiting list?",
    "Good day! [Product] is temporarily unavailable. However we have [alternative] which is similar. Would you like to see it?",
  ],
  "Complaint Handling": [
    "We sincerely apologize for this experience. This is not our standard. Please share more details and we will resolve this immediately.",
    "Hello! We are very sorry to hear this. Your satisfaction is our priority. Please allow us to make it right for you.",
    "We deeply apologize for the inconvenience. Kindly send us your order details and we will personally handle this matter today.",
  ],
  "Thank You": [
    "Thank you so much for your purchase! We truly appreciate your support. Please leave us a review and come back soon!",
    "Thank you for choosing us! Your order has been noted. We hope you absolutely love it. Don't hesitate to return!",
    "We're so grateful for your business! Tell a friend and enjoy 10% off your next order with code: THANKYOU",
  ],
  "Price Negotiation": [
    "We understand your budget concern. Our prices are already competitive for the quality offered. However for bulk orders we can discuss.",
    "Hello! Our pricing reflects the quality and service we provide. We unfortunately cannot go lower but we can offer free delivery!",
    "Hi! We appreciate your interest. Our best price for [product] is [price]. This is our final offer but we guarantee quality!",
  ],
  "Follow Up After No Response": [
    "Hello! Just following up on your inquiry about [product]. Are you still interested? We're here to help!",
    "Hi! We noticed you haven't replied yet. Your order slot is still available. Shall we proceed?",
    "Good day! Just checking if you had any questions about your inquiry. We'd love to assist you today!",
  ],
};

// ─── Sections ─────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "reply",     icon: "⚡", label: "Smart Reply",     desc: "Paste any customer message" },
  { id: "content",  icon: "✦",  label: "Daily Content",   desc: "Posts, captions, status" },
  { id: "advisor",  icon: "◈",  label: "Business Advisor", desc: "Ask anything about your business" },
  { id: "templates",icon: "▦",  label: "Templates",        desc: "Copy-paste WhatsApp replies" },
  { id: "startup",  icon: "◎",  label: "Startup Guide",    desc: "Plan your new business" },
  { id: "marketing",icon: "◆",  label: "Marketing Planner", desc: "Campaigns and promotions" },
  { id: "health",   icon: "●",  label: "Business Health",  desc: "Weekly business checkup" },
  { id: "invoice",  icon: "▤",  label: "Invoice Generator", desc: "Professional invoices instantly" },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Loader() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#4AE54A", animation: `bounce 1.2s ease ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

function OnboardingModal({ onDone }) {
  const [biz, setBiz] = useState("");
  const [where, setWhere] = useState("");
  const [country, setCountry] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [delivery, setDelivery] = useState("");
  const [payment, setPayment] = useState("");
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "What do you sell?",
      sub: "Be specific. E.g. Women's shoes, homemade food, electronics",
      field: <textarea value={biz} onChange={e => setBiz(e.target.value)} placeholder="I sell..." rows={2} style={taStyle} />,
      valid: biz.trim().length > 3,
    },
    {
      title: "Where do you sell?",
      sub: "Select all that apply",
      field: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {["WhatsApp", "Instagram", "Facebook", "Physical Shop", "Online Store", "TikTok"].map(w => (
            <div key={w} onClick={() => setWhere(p => p.includes(w) ? p.replace(w+",","").replace(","+w,"").replace(w,"") : p ? p+","+w : w)}
              style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${where.includes(w) ? "#4AE54A" : "#1a2f1a"}`, background: where.includes(w) ? "#1a3f1a" : "transparent", color: where.includes(w) ? "#4AE54A" : "#888", cursor: "pointer", fontSize: 14 }}>
              {w}
            </div>
          ))}
        </div>
      ),
      valid: where.length > 0,
    },
    {
      title: "What country are you in?",
      sub: "This helps us give you relevant advice",
      field: <input value={country} onChange={e => setCountry(e.target.value)} placeholder="E.g. Nigeria, Kenya, Ghana, Indonesia..." style={inputStyle} />,
      valid: country.trim().length > 2,
    },
    {
      title: "What is your price range?",
      sub: "Roughly how much do your products/services cost?",
      field: <input value={priceRange} onChange={e => setPriceRange(e.target.value)} placeholder="E.g. ₦2,000 - ₦50,000 or $10 - $200" style={inputStyle} />,
      valid: priceRange.trim().length > 2,
    },
    {
      title: "Do you offer delivery?",
      field: (
        <div style={{ display: "flex", gap: 10 }}>
          {["Yes, I deliver", "No, pickup only", "Both options"].map(d => (
            <div key={d} onClick={() => setDelivery(d)}
              style={{ padding: "10px 16px", borderRadius: 10, border: `2px solid ${delivery === d ? "#4AE54A" : "#1a2f1a"}`, background: delivery === d ? "#1a3f1a" : "transparent", color: delivery === d ? "#4AE54A" : "#888", cursor: "pointer", fontSize: 13 }}>
              {d}
            </div>
          ))}
        </div>
      ),
      valid: delivery.length > 0,
    },
    {
      title: "What payment methods do you accept?",
      field: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {["Bank Transfer", "Cash", "Mobile Money", "PayPal", "Card", "Crypto"].map(p => (
            <div key={p} onClick={() => setPayment(prev => prev.includes(p) ? prev.replace(p+",","").replace(","+p,"").replace(p,"") : prev ? prev+","+p : p)}
              style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${payment.includes(p) ? "#4AE54A" : "#1a2f1a"}`, background: payment.includes(p) ? "#1a3f1a" : "transparent", color: payment.includes(p) ? "#4AE54A" : "#888", cursor: "pointer", fontSize: 14 }}>
              {p}
            </div>
          ))}
        </div>
      ),
      valid: payment.length > 0,
    },
  ];

  const current = steps[step];

  const finish = () => {
    const profile = { biz, where, country, priceRange, delivery, payment };
    store.set("replo_profile", profile);
    onDone(profile);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }}>
      <div style={{ background: "#0d150d", border: "1px solid #1a3f1a", borderRadius: 20, padding: "36px 28px", maxWidth: 480, width: "100%", animation: "fadeUp 0.4s ease" }}>
        <div style={{ fontSize: 11, color: "#4AE54A", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>
          Step {step + 1} of {steps.length}
        </div>
        <div style={{ height: 3, background: "#1a2f1a", borderRadius: 2, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((step + 1) / steps.length) * 100}%`, background: "#4AE54A", borderRadius: 2, transition: "width 0.4s" }} />
        </div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#e8f5e8", marginBottom: 8 }}>{current.title}</h2>
        {current.sub && <p style={{ fontSize: 14, color: "#556655", marginBottom: 20, fontFamily: "Georgia, serif" }}>{current.sub}</p>}
        <div style={{ marginBottom: 28 }}>{current.field}</div>
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "13px", background: "none", border: "1px solid #1a3f1a", borderRadius: 10, color: "#556655", fontSize: 14 }}>← Back</button>
          )}
          <button onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : finish()}
            disabled={!current.valid}
            style={{ flex: 2, padding: "13px", background: current.valid ? "#4AE54A" : "#1a2f1a", color: current.valid ? "#0a0f0a" : "#334433", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, transition: "all 0.2s" }}>
            {step < steps.length - 1 ? "Continue →" : "Start using Replo →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaywallModal({ onClose, onSuccess }) {
  const [plan, setPlan] = useState("annual");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("plans");
  const [paying, setPaying] = useState(false);

  const amount = plan === "monthly" ? PRICE_MONTHLY : PRICE_ANNUAL;
  const label = plan === "monthly" ? `$${PRICE_MONTHLY}/month` : `$${PRICE_ANNUAL}/year`;

  const pay = () => {
    if (!email.includes("@")) return;
    setPaying(true);
    initPaystack({
      email, amount, plan,
      onSuccess: (r) => { store.set("replo_pro", true); store.set("replo_pro_email", email); setPaying(false); onSuccess(); },
      onClose: () => setPaying(false),
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}>
      <div style={{ background: "#0d150d", border: "1px solid #1a3f1a", borderRadius: 20, padding: "32px 28px", maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#4AE54A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#0a0f0a", margin: "0 auto 16px" }}>R</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#e8f5e8", marginBottom: 8 }}>Upgrade to Replo Pro</h2>
          <p style={{ color: "#556655", fontSize: 14, fontFamily: "Georgia, serif" }}>Unlimited AI replies, content, and business advice every day.</p>
        </div>

        {step === "plans" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                { id: "monthly", label: "Monthly", price: `$${PRICE_MONTHLY}`, per: "/month" },
                { id: "annual", label: "Annual", price: `$${Math.round(PRICE_ANNUAL/12)}`, per: "/month", badge: "Save 40%", billed: `Billed $${PRICE_ANNUAL}/year` },
              ].map(p => (
                <div key={p.id} onClick={() => setPlan(p.id)} style={{ flex: 1, padding: "14px 10px", border: `2px solid ${plan === p.id ? "#4AE54A" : "#1a2f1a"}`, borderRadius: 12, cursor: "pointer", textAlign: "center", position: "relative", background: plan === p.id ? "#0f200f" : "transparent", transition: "all 0.2s" }}>
                  {p.badge && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#4AE54A", color: "#0a0f0a", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{p.badge}</div>}
                  <div style={{ fontSize: 11, color: "#556655", marginBottom: 4 }}>{p.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: plan === p.id ? "#4AE54A" : "#ccc" }}>{p.price}</span>
                    <span style={{ fontSize: 12, color: "#556655" }}>{p.per}</span>
                  </div>
                  {p.billed && <div style={{ fontSize: 10, color: "#445544", marginTop: 2 }}>{p.billed}</div>}
                </div>
              ))}
            </div>
            <div style={{ background: "#111811", borderRadius: 12, padding: "16px", marginBottom: 18, border: "1px solid #1a2f1a" }}>
              {["Unlimited AI replies daily", "Daily content generator", "Business advisor chat", "All message templates", "Startup business guide", "Marketing planner", "Weekly health check", "Invoice generator", "Priority responses"].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: i < 8 ? 8 : 0 }}>
                  <span style={{ color: "#4AE54A", fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#aabba a" }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("email")} style={{ width: "100%", padding: "14px", background: "#4AE54A", color: "#0a0f0a", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Continue →</button>
          </>
        )}

        {step === "email" && (
          <>
            <div style={{ background: "#111811", borderRadius: 10, padding: "14px 16px", marginBottom: 16, border: "1px solid #1a2f1a" }}>
              <div style={{ fontSize: 12, color: "#556655", marginBottom: 4 }}>Selected plan</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#4AE54A" }}>{label}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#556655", display: "block", marginBottom: 8 }}>Your email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </div>
            <button onClick={pay} disabled={!email.includes("@") || paying}
              style={{ width: "100%", padding: "14px", background: email.includes("@") && !paying ? "#4AE54A" : "#1a2f1a", color: email.includes("@") && !paying ? "#0a0f0a" : "#334433", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
              {paying ? "Opening payment..." : `Pay ${label} →`}
            </button>
            <button onClick={() => setStep("plans")} style={{ width: "100%", padding: "12px", background: "none", color: "#556655", border: "1px solid #1a2f1a", borderRadius: 10, fontSize: 14 }}>← Back</button>
          </>
        )}

        <button onClick={onClose} style={{ width: "100%", padding: "11px", background: "none", color: "#334433", border: "none", fontSize: 13, marginTop: 8 }}>Maybe later</button>
        <p style={{ textAlign: "center", fontSize: 11, color: "#334433", marginTop: 6, fontFamily: "Georgia, serif" }}>Secured by Paystack. Cancel anytime.</p>
      </div>
    </div>
  );
}

// ─── Feature Screens ──────────────────────────────────────────────────────────

function SmartReply({ profile, isPro, onUpgrade }) {
  const [customerMsg, setCustomerMsg] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usedToday, setUsedToday] = useState(() => store.get("replo_reply_count", 0));

  const generate = async () => {
    if (!customerMsg.trim()) return;
    if (!isPro && usedToday >= FREE_DAILY_LIMIT) { onUpgrade(); return; }
    setLoading(true); setReply("");
    try {
      const system = `You are a professional business reply assistant for a small business owner.
Business: ${profile.biz}
Sells on: ${profile.where}
Country: ${profile.country}
Price range: ${profile.priceRange}
Delivery: ${profile.delivery}
Payment: ${profile.payment}

Generate ONE professional, warm, and persuasive reply to the customer message. Keep it conversational but professional. Under 100 words. Do not include any preamble or explanation — just the reply text itself. Make it feel human, not robotic.`;
      const text = await callAI([{ role: "user", content: `Customer message: "${customerMsg}"` }], system);
      setReply(text);
      const newCount = usedToday + 1;
      setUsedToday(newCount);
      store.set("replo_reply_count", newCount);
    } catch (e) { setReply("Error: " + e.message); }
    finally { setLoading(false); }
  };

  const copy = () => { navigator.clipboard.writeText(reply); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={sectionWrap}>
      <h2 style={sectionTitle}>⚡ Smart Reply</h2>
      <p style={sectionSub}>Paste any customer message and get an instant professional reply to copy and send.</p>
      {!isPro && <div style={usageBar(usedToday, FREE_DAILY_LIMIT)} />}
      <textarea value={customerMsg} onChange={e => setCustomerMsg(e.target.value)} placeholder="Paste customer message here... E.g. 'How much is the red bag? Is delivery free?'" rows={4} style={taStyle} />
      <button onClick={generate} disabled={loading || !customerMsg.trim()} style={btnPrimary(customerMsg.trim() && !loading)}>
        {loading ? "Generating reply..." : "Generate Reply →"}
      </button>
      {loading && <Loader />}
      {reply && (
        <div style={resultBox}>
          <div style={{ fontSize: 11, color: "#4AE54A", fontFamily: "monospace", marginBottom: 10, letterSpacing: "0.1em" }}>YOUR REPLY — COPY AND SEND</div>
          <p style={{ fontSize: 15, color: "#e8f5e8", lineHeight: 1.75, fontFamily: "Georgia, serif", marginBottom: 16 }}>{reply}</p>
          <button onClick={copy} style={{ ...btnPrimary(true), width: "auto", padding: "10px 20px" }}>
            {copied ? "Copied! ✓" : "Copy Reply"}
          </button>
        </div>
      )}
    </div>
  );
}

function DailyContent({ profile, isPro, onUpgrade }) {
  const [type, setType] = useState("instagram");
  const [product, setProduct] = useState("");
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(false);

  const types = [
    { id: "instagram", label: "Instagram Caption" },
    { id: "whatsapp", label: "WhatsApp Status" },
    { id: "facebook", label: "Facebook Post" },
    { id: "tiktok", label: "TikTok Caption" },
    { id: "promotion", label: "Promo Announcement" },
  ];

  const generate = async () => {
    if (!isPro) { onUpgrade(); return; }
    setLoading(true); setContent([]);
    try {
      const system = `You are a social media content creator for small businesses.
Business: ${profile.biz}
Country: ${profile.country}
Platform: ${type}
Generate 3 different ${type} posts for the product/service specified. Each post should be engaging, include relevant emojis, and have a call to action. Format as:
POST 1:
[content]

POST 2:
[content]

POST 3:
[content]`;
      const text = await callAI([{ role: "user", content: product ? `Create posts for: ${product}` : "Create general business posts for today" }], system);
      const posts = text.split(/POST \d+:/i).filter(p => p.trim()).map(p => p.trim());
      setContent(posts);
    } catch (e) { setContent(["Error: " + e.message]); }
    finally { setLoading(false); }
  };

  return (
    <div style={sectionWrap}>
      <h2 style={sectionTitle}>✦ Daily Content</h2>
      <p style={sectionSub}>Generate ready-to-post content for all your platforms. {!isPro && <span style={{ color: "#4AE54A" }}>Pro feature</span>}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {types.map(t => (
          <div key={t.id} onClick={() => setType(t.id)} style={{ padding: "8px 14px", borderRadius: 20, border: `2px solid ${type === t.id ? "#4AE54A" : "#1a2f1a"}`, background: type === t.id ? "#1a3f1a" : "transparent", color: type === t.id ? "#4AE54A" : "#556655", cursor: "pointer", fontSize: 13 }}>{t.label}</div>
        ))}
      </div>
      <input value={product} onChange={e => setProduct(e.target.value)} placeholder="Specific product or leave blank for general content" style={{ ...inputStyle, marginBottom: 12 }} />
      <button onClick={generate} disabled={loading} style={btnPrimary(!loading)}>
        {!isPro ? "Unlock Content Generator (Pro) →" : loading ? "Generating..." : "Generate 3 Posts →"}
      </button>
      {loading && <Loader />}
      {content.map((post, i) => (
        <div key={i} style={{ ...resultBox, marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#4AE54A", fontFamily: "monospace", marginBottom: 8 }}>POST {i + 1}</div>
          <p style={{ fontSize: 14, color: "#e8f5e8", lineHeight: 1.75, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>{post}</p>
          <button onClick={() => { navigator.clipboard.writeText(post); }} style={{ ...btnPrimary(true), width: "auto", padding: "8px 16px", marginTop: 10, fontSize: 13 }}>Copy</button>
        </div>
      ))}
    </div>
  );
}

function BusinessAdvisor({ profile, isPro, onUpgrade }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    if (!isPro && messages.length >= 6) { onUpgrade(); return; }
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(""); setLoading(true);
    try {
      const system = `You are an experienced business advisor for small business owners.
Business: ${profile.biz}
Location: ${profile.country}
Sells on: ${profile.where}
Price range: ${profile.priceRange}

Give direct, practical advice specific to their business. Be concise — under 150 words. Ask follow-up questions when needed. Think like a mentor who has run successful small businesses.`;
      const reply = await callAI(newMsgs.map(m => ({ role: m.role, content: m.content })), system);
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } catch (e) { setMessages([...newMsgs, { role: "assistant", content: "Error: " + e.message }]); }
    finally { setLoading(false); }
  };

  return (
    <div style={sectionWrap}>
      <h2 style={sectionTitle}>◈ Business Advisor</h2>
      <p style={sectionSub}>Ask anything about your business. Pricing, sales, marketing, decisions — get expert advice instantly.</p>
      <div style={{ minHeight: 200, marginBottom: 16 }}>
        {messages.length === 0 && (
          <div style={{ padding: "20px", background: "#111811", borderRadius: 12, border: "1px solid #1a2f1a" }}>
            <p style={{ color: "#556655", fontSize: 14, fontFamily: "Georgia, serif", marginBottom: 16 }}>Try asking:</p>
            {["Should I run a discount this week?", "My sales dropped, what should I do?", "How much should I charge for delivery?", "How do I get more customers on Instagram?"].map((q, i) => (
              <div key={i} onClick={() => setInput(q)} style={{ padding: "8px 12px", background: "#1a2f1a", borderRadius: 8, marginBottom: 8, cursor: "pointer", fontSize: 13, color: "#88aa88" }}>{q}</div>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {msg.role === "assistant" && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#4AE54A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#0a0f0a", marginRight: 8, flexShrink: 0, marginTop: 4 }}>R</div>}
            <div style={{ maxWidth: "80%", background: msg.role === "user" ? "#4AE54A" : "#111811", color: msg.role === "user" ? "#0a0f0a" : "#e8f5e8", padding: "12px 16px", borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px", fontSize: 14, lineHeight: 1.7, fontFamily: "Georgia, serif", border: msg.role === "assistant" ? "1px solid #1a2f1a" : "none", whiteSpace: "pre-wrap" }}>{msg.content}</div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: "#4AE54A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#0a0f0a" }}>R</div><Loader /></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Ask anything about your business..." style={{ ...inputStyle, flex: 1 }} disabled={loading} />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: input.trim() && !loading ? "#4AE54A" : "#1a2f1a", color: input.trim() && !loading ? "#0a0f0a" : "#334433", border: "none", borderRadius: 10, width: 46, height: 46, fontSize: 18, flexShrink: 0 }}>→</button>
      </div>
    </div>
  );
}

function Templates() {
  const [cat, setCat] = useState("Price Inquiry");
  const [copied, setCopied] = useState(null);

  const copy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={sectionWrap}>
      <h2 style={sectionTitle}>▦ Message Templates</h2>
      <p style={sectionSub}>Professional WhatsApp reply templates. Copy, customize, and send.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {Object.keys(TEMPLATES).map(c => (
          <div key={c} onClick={() => setCat(c)} style={{ padding: "7px 14px", borderRadius: 20, border: `2px solid ${cat === c ? "#4AE54A" : "#1a2f1a"}`, background: cat === c ? "#1a3f1a" : "transparent", color: cat === c ? "#4AE54A" : "#556655", cursor: "pointer", fontSize: 12 }}>{c}</div>
        ))}
      </div>
      {TEMPLATES[cat].map((t, i) => (
        <div key={i} style={{ ...resultBox, marginBottom: 12 }}>
          <p style={{ fontSize: 14, color: "#e8f5e8", lineHeight: 1.75, fontFamily: "Georgia, serif", marginBottom: 12 }}>{t}</p>
          <button onClick={() => copy(t, i)} style={{ ...btnPrimary(true), width: "auto", padding: "8px 16px", fontSize: 13 }}>
            {copied === i ? "Copied! ✓" : "Copy"}
          </button>
        </div>
      ))}
    </div>
  );
}

function StartupGuide({ profile, isPro, onUpgrade }) {
  const [situation, setSituation] = useState("");
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!isPro) { onUpgrade(); return; }
    setLoading(true); setResult("");
    try {
      const system = `You are a startup mentor helping someone launch their first business in ${profile.country}.
Generate a practical startup guide including:
1. 3 realistic business ideas based on their situation and budget
2. For the most suitable idea: startup costs breakdown, first steps to take, where to find first customers, common mistakes to avoid
3. A 30-day action plan
Be specific to their country and budget. Use local context.`;
      const text = await callAI([{ role: "user", content: `My situation: ${situation}\nBudget: ${budget}\nGoal: ${goal}` }], system);
      setResult(text);
    } catch (e) { setResult("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={sectionWrap}>
      <h2 style={sectionTitle}>◎ Startup Guide</h2>
      <p style={sectionSub}>Want to start a business but don't know where to begin? Tell us your situation and we'll build your plan. {!isPro && <span style={{ color: "#4AE54A" }}>Pro feature</span>}</p>
      <textarea value={situation} onChange={e => setSituation(e.target.value)} placeholder="Describe your current situation, skills, and experience..." rows={3} style={{ ...taStyle, marginBottom: 12 }} />
      <input value={budget} onChange={e => setBudget(e.target.value)} placeholder="Available startup budget (e.g. ₦50,000 or $200)" style={{ ...inputStyle, marginBottom: 12 }} />
      <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Your main goal (e.g. extra income, full time business, financial freedom)" style={{ ...inputStyle, marginBottom: 12 }} />
      <button onClick={generate} disabled={loading || !situation.trim()} style={btnPrimary(situation.trim() && !loading)}>
        {!isPro ? "Unlock Startup Guide (Pro) →" : loading ? "Building your plan..." : "Generate My Startup Plan →"}
      </button>
      {loading && <Loader />}
      {result && <div style={{ ...resultBox, marginTop: 16 }}><p style={{ fontSize: 14, color: "#e8f5e8", lineHeight: 1.85, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>{result}</p></div>}
    </div>
  );
}

function MarketingPlanner({ profile, isPro, onUpgrade }) {
  const [event, setEvent] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!isPro) { onUpgrade(); return; }
    setLoading(true); setResult("");
    try {
      const system = `You are a marketing strategist for small businesses in ${profile.country}.
Business: ${profile.biz}
Create a detailed marketing campaign plan for the specified event/season. Include:
- Campaign theme and key message
- Content ideas for each day of the campaign week
- Specific post ideas for ${platform}
- Promotional offer suggestions
- Hashtags to use
- Best times to post
Be practical and specific.`;
      const text = await callAI([{ role: "user", content: `Create a marketing plan for: ${event || "this week's general promotion"} on ${platform}` }], system);
      setResult(text);
    } catch (e) { setResult("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={sectionWrap}>
      <h2 style={sectionTitle}>◆ Marketing Planner</h2>
      <p style={sectionSub}>Get a full marketing campaign plan for any event, season, or promotion. {!isPro && <span style={{ color: "#4AE54A" }}>Pro feature</span>}</p>
      <input value={event} onChange={e => setEvent(e.target.value)} placeholder="Event or campaign (e.g. Black Friday, Ramadan, End of Month sale, New product launch)" style={{ ...inputStyle, marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["Instagram", "WhatsApp", "Facebook", "TikTok", "All Platforms"].map(p => (
          <div key={p} onClick={() => setPlatform(p)} style={{ padding: "7px 14px", borderRadius: 20, border: `2px solid ${platform === p ? "#4AE54A" : "#1a2f1a"}`, background: platform === p ? "#1a3f1a" : "transparent", color: platform === p ? "#4AE54A" : "#556655", cursor: "pointer", fontSize: 12 }}>{p}</div>
        ))}
      </div>
      <button onClick={generate} disabled={loading} style={btnPrimary(!loading)}>
        {!isPro ? "Unlock Marketing Planner (Pro) →" : loading ? "Creating campaign..." : "Generate Campaign Plan →"}
      </button>
      {loading && <Loader />}
      {result && <div style={{ ...resultBox, marginTop: 16 }}><p style={{ fontSize: 14, color: "#e8f5e8", lineHeight: 1.85, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>{result}</p></div>}
    </div>
  );
}

function BusinessHealth({ profile, isPro, onUpgrade }) {
  const [sales, setSales] = useState("");
  const [challenge, setChallenge] = useState("");
  const [worked, setWorked] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!isPro) { onUpgrade(); return; }
    setLoading(true); setResult("");
    try {
      const system = `You are a business coach reviewing a small business owner's weekly performance in ${profile.country}.
Business: ${profile.biz}
Give a structured weekly health report including:
- Performance assessment
- Key strengths this week
- Areas needing improvement
- 3 specific action steps for next week
- One motivational insight
Be encouraging but honest. Be specific.`;
      const text = await callAI([{ role: "user", content: `Sales this week: ${sales}\nBiggest challenge: ${challenge}\nWhat worked: ${worked}` }], system);
      setResult(text);
    } catch (e) { setResult("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={sectionWrap}>
      <h2 style={sectionTitle}>● Business Health Check</h2>
      <p style={sectionSub}>Your weekly business review. Understand what's working and what to fix. {!isPro && <span style={{ color: "#4AE54A" }}>Pro feature</span>}</p>
      <input value={sales} onChange={e => setSales(e.target.value)} placeholder="How many sales did you make this week?" style={{ ...inputStyle, marginBottom: 12 }} />
      <textarea value={challenge} onChange={e => setChallenge(e.target.value)} placeholder="What was your biggest challenge this week?" rows={2} style={{ ...taStyle, marginBottom: 12 }} />
      <textarea value={worked} onChange={e => setWorked(e.target.value)} placeholder="What worked well this week?" rows={2} style={{ ...taStyle, marginBottom: 12 }} />
      <button onClick={generate} disabled={loading || !sales.trim()} style={btnPrimary(sales.trim() && !loading)}>
        {!isPro ? "Unlock Health Check (Pro) →" : loading ? "Analyzing your week..." : "Get My Weekly Report →"}
      </button>
      {loading && <Loader />}
      {result && <div style={{ ...resultBox, marginTop: 16 }}><p style={{ fontSize: 14, color: "#e8f5e8", lineHeight: 1.85, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>{result}</p></div>}
    </div>
  );
}

function InvoiceGenerator({ profile, isPro, onUpgrade }) {
  const [client, setClient] = useState("");
  const [items, setItems] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!isPro) { onUpgrade(); return; }
    setLoading(true); setResult("");
    try {
      const system = `You are an invoice generator for small businesses.
Business: ${profile.biz}
Country: ${profile.country}
Payment methods: ${profile.payment}

Generate a clean, professional invoice in text format that can be screenshot and sent. Include:
- Invoice number (random 4 digits)
- Date
- Business name and payment details
- Client name
- Itemized list with quantities and prices
- Subtotal and total
- Payment instructions
- Thank you note
Format it clearly with proper spacing.`;
      const text = await callAI([{ role: "user", content: `Client: ${client}\nItems/Services: ${items}` }], system);
      setResult(text);
    } catch (e) { setResult("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={sectionWrap}>
      <h2 style={sectionTitle}>▤ Invoice Generator</h2>
      <p style={sectionSub}>Create professional invoices in seconds. Screenshot and send directly to clients. {!isPro && <span style={{ color: "#4AE54A" }}>Pro feature</span>}</p>
      <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name" style={{ ...inputStyle, marginBottom: 12 }} />
      <textarea value={items} onChange={e => setItems(e.target.value)} placeholder="List items/services with quantities and prices. E.g: 2x Women shoes - ₦15,000 each, Delivery - ₦1,500" rows={4} style={{ ...taStyle, marginBottom: 12 }} />
      <button onClick={generate} disabled={loading || !client.trim() || !items.trim()} style={btnPrimary(client.trim() && items.trim() && !loading)}>
        {!isPro ? "Unlock Invoice Generator (Pro) →" : loading ? "Generating invoice..." : "Generate Invoice →"}
      </button>
      {loading && <Loader />}
      {result && (
        <div style={{ ...resultBox, marginTop: 16, fontFamily: "monospace" }}>
          <pre style={{ fontSize: 13, color: "#e8f5e8", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 16 }}>{result}</pre>
          <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ ...btnPrimary(true), width: "auto", padding: "10px 20px" }}>
            {copied ? "Copied! ✓" : "Copy Invoice"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const taStyle = { width: "100%", background: "#0d150d", border: "1px solid #1a2f1a", borderRadius: 10, padding: "14px 16px", color: "#e8f5e8", fontSize: 15, fontFamily: "Georgia, serif", lineHeight: 1.65, resize: "none", outline: "none", transition: "border-color 0.2s" };
const inputStyle = { width: "100%", background: "#0d150d", border: "1px solid #1a2f1a", borderRadius: 10, padding: "13px 16px", color: "#e8f5e8", fontSize: 15, fontFamily: "Georgia, serif", outline: "none", transition: "border-color 0.2s" };
const sectionWrap = { maxWidth: 680, margin: "0 auto", width: "100%", padding: "24px 20px 120px" };
const sectionTitle = { fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#e8f5e8", marginBottom: 8 };
const sectionSub = { color: "#556655", fontSize: 14, fontFamily: "Georgia, serif", lineHeight: 1.65, marginBottom: 20 };
const resultBox = { background: "#0d150d", border: "1px solid #1a3f1a", borderRadius: 12, padding: "20px" };
const btnPrimary = (active) => ({ width: "100%", padding: "14px", background: active ? "#4AE54A" : "#1a2f1a", color: active ? "#0a0f0a" : "#334433", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, transition: "all 0.2s", marginBottom: 12, cursor: active ? "pointer" : "not-allowed" });
const usageBar = (used, limit) => ({ marginBottom: 16, padding: "10px 14px", background: "#0d150d", border: "1px solid #1a2f1a", borderRadius: 8, fontSize: 12, color: used >= limit ? "#F04A6B" : "#556655", fontFamily: "monospace" });

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile]       = useState(() => store.get("replo_profile", null));
  const [isPro, setIsPro]           = useState(() => store.get("replo_pro", false));
  const [activeSection, setSection] = useState("reply");
  const [showPaywall, setPaywall]   = useState(false);
  const [showOnboard, setOnboard]   = useState(false);

  useEffect(() => {
    if (!profile) setOnboard(true);
  }, []);

  const handleOnboardDone = (p) => { setProfile(p); setOnboard(false); };
  const handleUpgrade = () => setPaywall(true);
  const handleProSuccess = () => { setIsPro(true); setPaywall(false); };

  const sectionProps = { profile: profile || {}, isPro, onUpgrade: handleUpgrade };

  const renderSection = () => {
    switch (activeSection) {
      case "reply":     return <SmartReply {...sectionProps} />;
      case "content":   return <DailyContent {...sectionProps} />;
      case "advisor":   return <BusinessAdvisor {...sectionProps} />;
      case "templates": return <Templates />;
      case "startup":   return <StartupGuide {...sectionProps} />;
      case "marketing": return <MarketingPlanner {...sectionProps} />;
      case "health":    return <BusinessHealth {...sectionProps} />;
      case "invoice":   return <InvoiceGenerator {...sectionProps} />;
      default:          return <SmartReply {...sectionProps} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8f5e8", fontFamily: "'Helvetica Neue', Arial, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        textarea:focus, input:focus { border-color: #4AE54A !important; }
      `}</style>

      {/* NAV */}
      <nav style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a2f1a", position: "sticky", top: 0, background: "#0a0f0a", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4AE54A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#0a0f0a" }}>R</div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.03em", color: "#e8f5e8" }}>Replo<span style={{ color: "#4AE54A" }}>.</span></span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isPro && <div style={{ fontSize: 11, color: "#4AE54A", fontFamily: "monospace", background: "rgba(74,229,74,0.1)", padding: "4px 10px", borderRadius: 6 }}>PRO</div>}
          {!isPro && <button onClick={() => setPaywall(true)} style={{ background: "#4AE54A", color: "#0a0f0a", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>Go Pro</button>}
          {profile && <button onClick={() => setOnboard(true)} style={{ background: "none", border: "1px solid #1a2f1a", color: "#556655", padding: "7px 13px", borderRadius: 8, fontSize: 13 }}>My Business</button>}
        </div>
      </nav>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!profile && !showOnboard ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", animation: "fadeUp 0.6s ease" }}>
            <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "#4AE54A", marginBottom: 24, fontFamily: "monospace" }}>AI Business Partner</div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px, 6vw, 52px)", lineHeight: 1.1, margin: "0 0 20px", color: "#e8f5e8" }}>
                Your AI employee.<br /><em style={{ color: "#4AE54A" }}>Always on. Never tired.</em>
              </h1>
              <p style={{ color: "#556655", fontSize: 16, lineHeight: 1.75, marginBottom: 40, fontFamily: "Georgia, serif" }}>
                Smart customer replies, daily content, business advice, and more — built for small business owners worldwide.
              </p>
              <button onClick={() => setOnboard(true)} style={{ ...btnPrimary(true), width: "auto", padding: "16px 40px", fontSize: 16 }}>Set Up My Business →</button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 48 }}>
                {SECTIONS.slice(0, 4).map(s => (
                  <div key={s.id} style={{ padding: "16px", background: "#0d150d", border: "1px solid #1a2f1a", borderRadius: 12, textAlign: "left" }}>
                    <div style={{ fontSize: 20, color: "#4AE54A", marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#88aa88", marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "#445544" }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {renderSection()}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      {profile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d150d", borderTop: "1px solid #1a2f1a", padding: "8px 4px", display: "flex", gap: 2, overflowX: "auto", zIndex: 100 }}>
          {SECTIONS.map(s => (
            <div key={s.id} onClick={() => setSection(s.id)} style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: activeSection === s.id ? "#1a3f1a" : "transparent", cursor: "pointer", transition: "background 0.2s", minWidth: 64 }}>
              <span style={{ fontSize: 18, color: activeSection === s.id ? "#4AE54A" : "#334433", marginBottom: 3 }}>{s.icon}</span>
              <span style={{ fontSize: 9, color: activeSection === s.id ? "#4AE54A" : "#334433", letterSpacing: "0.05em", textAlign: "center", lineHeight: 1.2 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {showOnboard && <OnboardingModal onDone={handleOnboardDone} />}
      {showPaywall && <PaywallModal onClose={() => setPaywall(false)} onSuccess={handleProSuccess} />}

      {/* FOOTER */}
      {!profile && (
        <footer style={{ padding: "16px 24px", borderTop: "1px solid #1a2f1a", display: "flex", justifyContent: "center", gap: 20 }}>
          {["Privacy", "Terms", "Contact"].map((l, i) => (
            <span key={i} style={{ fontSize: 12, color: "#334433", cursor: "pointer" }}
              onClick={() => { if (l === "Contact") window.location.href = `mailto:${CONTACT_EMAIL}`; }}>
              {l}
            </span>
          ))}
          <span style={{ fontSize: 12, color: "#334433" }}>Built by {OWNER_NAME}</span>
        </footer>
      )}
    </div>
  );
}
