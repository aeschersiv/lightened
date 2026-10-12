// Lightened Productions site behavior: decade switcher and the two forms.
// Form submissions go to Supabase. The key below is a publishable key: the tables only accept inserts.
const SUPABASE_URL = "https://vtbpucechlrazufkdnfs.supabase.co";
const SUPABASE_KEY = "sb_publishable_OlxkOV11uakdLZlRfrpssA_85Cm5cLt";

const ERAS = {
  "60s": "The band in one room, everyone bleeding a little into each other's mics.",
  "70s": "Warm, thick drums and guitars that sound like they came off tape.",
  "80s": "Big, bright snares and shimmering, wide-open choruses.",
  "90s": "Fuzz pedals, loud-quiet-loud dynamics, vocals that don't try too hard.",
  "00s": "Tight, punchy garage-rock energy with plenty of edge."
};

function setEra(era) {
  if (!ERAS[era]) return;
  document.documentElement.dataset.era = era;
  document.querySelectorAll(".era-buttons button").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.era === era));
  });
  document.getElementById("era-line").textContent = ERAS[era];
  try { localStorage.setItem("lightened-era", era); } catch (_) {}
}

document.querySelectorAll(".era-buttons button").forEach(b => {
  b.addEventListener("click", () => setEra(b.dataset.era));
});
try { const saved = localStorage.getItem("lightened-era"); if (saved) setEra(saved); } catch (_) {}

async function insert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error(`Save failed (${res.status})`);
}

const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function wire(formId, table, build, okText) {
  const form = document.getElementById(formId);
  if (!form) return;
  const el = form.elements;
  const status = form.querySelector(".status");
  const button = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    status.className = "status";
    if (el.website && el.website.value) return; // spam trap
    const name = el.name.value.trim();
    const email = el.email.value.trim();
    el.name.setAttribute("aria-invalid", String(!name));
    el.email.setAttribute("aria-invalid", String(!emailOk(email)));
    if (!name || !emailOk(email)) {
      status.textContent = !name ? "Add your name so we know who's coming." : "Check your email address. We send your confirmation there.";
      status.classList.add("err");
      (!name ? el.name : el.email).focus();
      return;
    }
    button.disabled = true;
    status.textContent = "Sending…";
    try {
      await insert(table, build(el, name, email));
      form.reset();
      status.textContent = okText;
      status.classList.add("ok");
    } catch (err) {
      status.textContent = "That didn't go through. Check your connection and try again.";
      status.classList.add("err");
    } finally {
      button.disabled = false;
    }
  });
}

wire("rsvp-form", "lightened_rsvps", (f, name, email) => ({
  name, email,
  guests: Number(f.guests.value) || 1,
  join_chat: f.join_chat.checked,
  is_artist: f.is_artist.checked
}), "You're on the list. We'll email the address and details before the 24th.");

wire("book-form", "lightened_inquiries", (f, name, email) => {
  const hours = parseFloat(f.hours.value);
  const clean = v => (v || "").trim() || null;
  return {
    kind: f.kind.value,
    name, email,
    phone: clean(f.phone.value),
    project: clean(f.project.value),
    preferred_dates: clean(f.preferred_dates.value),
    hours: Number.isFinite(hours) && hours >= 1 && hours <= 80 ? hours : null,
    message: clean(f.message.value)
  };
}, "Request sent. James will reach out to confirm your time and send the booking-fee link.");
