import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles } from "@/lib/session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { geocodeLocation } from "@/lib/geocode.functions";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { Loader2, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/become-provider")({
  head: () => ({ meta: [{ title: "Become a provider — Nearby" }, { name: "robots", content: "noindex" }] }),
  component: BecomeProviderPage,
});

function BecomeProviderPage() {
  const { user } = useSession();
  const { data: roles = [] } = useRoles(user);
  const isProvider = roles.includes("provider");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const geocode = useServerFn(geocodeLocation);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("service_categories").select("id,name,icon").order("sort_order");
      return data ?? [];
    },
  });

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [form, setForm] = useState({
    business_name: "",
    bio: "",
    phone: "",
    hourly_rate: "",
    service_radius_km: 25,
    address: "",
    city: "",
    zip: "",
    availability_note: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  if (isProvider) {
    return (
      <div className="min-h-screen bg-canvas grid place-items-center px-6 pb-24">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="size-12 text-accent mx-auto" />
          <h1 className="text-xl font-black mt-3">You're already a provider</h1>
          <p className="text-sm text-brand/60 mt-2">Manage your listing and orders from the dashboard.</p>
          <Link to="/dashboard" className="inline-block mt-4 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-bold">
            Open dashboard
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const geocodeAddress = async () => {
    const q = [form.address, form.city, form.zip].filter(Boolean).join(", ");
    if (!q) return toast.error("Enter address, city, or ZIP first");
    setGeocoding(true);
    try {
      const res = await geocode({ data: { query: q } });
      if (!res.found) toast.error("Location not found");
      else {
        setForm((f) => ({ ...f, latitude: res.lat, longitude: res.lng }));
        toast.success(`Located: ${res.formatted}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGeocoding(false);
    }
  };

  const submit = async () => {
    if (!form.business_name) return toast.error("Business name is required");
    if (selectedCats.length === 0) return toast.error("Pick at least one category");
    setSaving(true);
    try {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: user!.id, role: "provider" });
      if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;

      const { error: profErr } = await supabase.from("provider_profiles").upsert({
        id: user!.id,
        business_name: form.business_name,
        bio: form.bio || null,
        phone: form.phone || null,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
        service_radius_km: form.service_radius_km,
        address: form.address || null,
        city: form.city || null,
        zip: form.zip || null,
        availability_note: form.availability_note || null,
        latitude: form.latitude,
        longitude: form.longitude,
        is_active: true,
      });
      if (profErr) throw profErr;

      await supabase.from("provider_categories").delete().eq("provider_id", user!.id);
      await supabase
        .from("provider_categories")
        .insert(selectedCats.map((cid) => ({ provider_id: user!.id, category_id: cid })));

      toast.success("Welcome aboard! Your provider account is live.");
      qc.invalidateQueries({ queryKey: ["roles", user!.id] });
      qc.invalidateQueries({ queryKey: ["providers"] });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas pb-32">
      <header className="bg-surface border-b border-brand/5 px-4 pt-6 pb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-accent">Step {step} of 3</div>
        <h1 className="text-xl font-black mt-1">Become a provider</h1>
        <div className="flex gap-1 mt-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded ${n <= step ? "bg-accent" : "bg-brand/10"}`} />
          ))}
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {step === 1 && (
          <section className="bg-surface p-4 rounded-2xl border border-brand/5 shadow-sm space-y-3">
            <h2 className="font-bold">About your business</h2>
            <Field label="Business name" required value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
            <Field label="Short bio" textarea value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} placeholder="What makes you great at what you do?" />
            <Field label="Contact phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hourly rate ($)" type="number" value={form.hourly_rate} onChange={(v) => setForm({ ...form, hourly_rate: v })} />
              <Field label="Availability" value={form.availability_note} onChange={(v) => setForm({ ...form, availability_note: v })} placeholder="e.g. Weekdays" />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="bg-surface p-4 rounded-2xl border border-brand/5 shadow-sm space-y-3">
            <h2 className="font-bold">Services you offer</h2>
            <p className="text-xs text-brand/60">Pick everything that applies. Customers browse by these.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((c: any) => {
                const on = selectedCats.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedCats(on ? selectedCats.filter((x) => x !== c.id) : [...selectedCats, c.id])}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${on ? "bg-brand text-white" : "bg-canvas border border-brand/10"}`}
                  >
                    {c.icon} {c.name}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="bg-surface p-4 rounded-2xl border border-brand/5 shadow-sm space-y-3">
            <h2 className="font-bold">Service area</h2>
            <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="ZIP" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
            </div>
            <Field label="Travel radius (km)" type="number" value={String(form.service_radius_km)} onChange={(v) => setForm({ ...form, service_radius_km: Number(v) || 0 })} />
            <button type="button" onClick={geocodeAddress} disabled={geocoding} className="w-full py-2.5 border border-brand/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60">
              {geocoding ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
              {form.latitude ? `Pinned (${form.latitude.toFixed(3)}, ${form.longitude!.toFixed(3)})` : "Pin location"}
            </button>
          </section>
        )}

        <div className="flex gap-2 pt-2">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 py-3 rounded-xl border border-brand/10 text-sm font-bold">
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !form.business_name) return toast.error("Business name is required");
                if (step === 2 && selectedCats.length === 0) return toast.error("Pick at least one category");
                setStep(step + 1);
              }}
              className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="size-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={saving} className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Create provider account
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, textarea, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; textarea?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase text-brand/40">{label}{required && " *"}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} required={required} className="mt-1 w-full bg-canvas rounded-xl py-2.5 px-3 text-sm outline-none resize-none" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="mt-1 w-full bg-canvas rounded-xl py-2.5 px-3 text-sm outline-none" />
      )}
    </label>
  );
}
