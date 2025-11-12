import React, { useState } from "react";

// --------------------------------------------------
// 💰 PLAN DATA TABLES
// --------------------------------------------------
const PLAN_DATA = {
  motjha: {
    Green: { 6: 132, 10: 165, 14: 187 },
    Silver: { 6: 180, 10: 242, 14: 308 },
    Gold: { 6: 264, 10: 341, 14: 473 },
  },
  single: {
    Green: { "18-65": 45, "66-85": 80, "86-100": 105 },
    Silver: { "18-65": 88, "66-85": 130, "86-100": 205 },
    Gold: { "18-65": 132, "66-85": 187, "86-100": 312 },
    Platinum: { "18-65": 165, "66-85": 275, "86-100": 415 },
    Black: { "18-65": 240, "66-85": 410 },
    Pearl: { "18-65": 405 },
    Ivory: { "18-65": 450 },
  },
  family: {
    Green: { "18-65": 65, "66-85": 90, "86-100": 145 },
    Silver: { "18-65": 115, "66-85": 150, "86-100": 285 },
    Gold: { "18-65": 152, "66-85": 207, "86-100": 402 },
    Platinum: { "18-65": 195, "66-85": 315, "86-100": 535 },
    Black: { "18-65": 280, "66-85": 470 },
    Pearl: { "18-65": 455 },
    Ivory: { "18-65": 565 },
  },
};

const COLOUR_GRADE = {
  Green: { casket: "Bedwood", tent: 1, chairs: 50, grocery: 100 },
  Silver: { casket: "Crucifix", tent: 1, chairs: 100, grocery: 100 },
  Gold: { casket: "Raised Halfview", tent: 1, chairs: 100, grocery: 100 },
  Platinum: { casket: "4-Tier", tent: 1, chairs: 100, grocery: 100 },
  Black: { casket: "Princeton Dome", tent: 1, chairs: 100, grocery: 150 },
  Pearl: { casket: "Royal Dome", tent: 1, chairs: 200, grocery: 100 },
  Ivory: { casket: "Tombstone", tent: 1, chairs: 200, grocery: 100 },
};

// --------------------------------------------------
// 🧾 FORM COMPONENT
// --------------------------------------------------
export default function ConsultationForm() {
  const [form, setForm] = useState({
    plan_category: "motjha",
    plan_name: "Green",
    plan_members: 6,
    plan_age_bracket: "18-65",
    deceased_name: "",
    deceased_id: "",
    nok_name: "",
    nok_contact: "",
    nok_relation: "",
    funeral_date: "",
    funeral_time: "",
    venue_name: "",
    venue_address: "",
    requires_cow: false,
    requires_tombstone: false,
    intake_day: "",
    service_type: "book", // 🆕 Added service type toggle
    total_price: "",
  });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // --------------------------------------------------
  // 💸 Calculate automatic plan price
  // --------------------------------------------------
  const getAutoPrice = () => {
    if (form.plan_category === "colour_grade") return 0;
    const plan = PLAN_DATA[form.plan_category][form.plan_name];
    const key =
      form.plan_category === "motjha"
        ? form.plan_members
        : form.plan_age_bracket;
    return plan?.[key] || 0;
  };

  const displayedPrice =
    form.service_type === "book"
      ? getAutoPrice()
      : form.total_price || "";

  // --------------------------------------------------
  // 📨 Submit form
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    const data = {
      ...form,
      total_price:
        form.service_type === "book"
          ? getAutoPrice()
          : parseFloat(form.total_price) || 0,
      venue_lat: null,
      venue_lng: null,
      status: "intake",
    };

    try {
      const res = await fetch(`${API_URL}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setMessage("✅ Case submitted successfully.");
      setForm({
        plan_category: "motjha",
        plan_name: "Green",
        plan_members: 6,
        plan_age_bracket: "18-65",
        deceased_name: "",
        deceased_id: "",
        nok_name: "",
        nok_contact: "",
        nok_relation: "",
        funeral_date: "",
        funeral_time: "",
        venue_name: "",
        venue_address: "",
        requires_cow: false,
        requires_tombstone: false,
        intake_day: "",
        service_type: "book",
        total_price: "",
      });
    } catch (err) {
      console.error("Submit error:", err);
      setMessage("❌ Failed to submit data. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // 🧩 FORM UI
  // --------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow"
    >
      <h2 className="text-2xl font-bold text-center text-tfs-red mb-6">
        Wednesday Family Consultation
      </h2>

      {/* 🧍 Deceased & NOK Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          placeholder="Deceased Name"
          required
          className="input"
          value={form.deceased_name}
          onChange={(e) =>
            setForm({ ...form, deceased_name: e.target.value })
          }
        />
        <input
          placeholder="ID Number"
          className="input"
          value={form.deceased_id}
          onChange={(e) => setForm({ ...form, deceased_id: e.target.value })}
        />
        <input
          placeholder="Next of Kin"
          required
          className="input"
          value={form.nok_name}
          onChange={(e) => setForm({ ...form, nok_name: e.target.value })}
        />
        <input
          placeholder="Contact"
          required
          className="input"
          value={form.nok_contact}
          onChange={(e) => setForm({ ...form, nok_contact: e.target.value })}
        />
        <input
          placeholder="Relation to Deceased"
          className="input"
          value={form.nok_relation}
          onChange={(e) =>
            setForm({ ...form, nok_relation: e.target.value })
          }
        />
      </div>

      {/* 📦 Plan Details */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <select
          className="input"
          value={form.plan_category}
          onChange={(e) =>
            setForm({
              ...form,
              plan_category: e.target.value,
              plan_name: "Green",
            })
          }
        >
          <option value="motjha">Motjha O Tlhele</option>
          <option value="single">Single</option>
          <option value="family">Family</option>
          <option value="colour_grade">Colour Grade</option>
        </select>

        <select
          className="input"
          value={form.plan_name}
          onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
        >
          {Object.keys(
            form.plan_category === "colour_grade"
              ? COLOUR_GRADE
              : PLAN_DATA[form.plan_category]
          ).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {form.plan_category !== "colour_grade" && (
          <select
            className="input"
            value={
              form.plan_category === "motjha"
                ? form.plan_members
                : form.plan_age_bracket
            }
            onChange={(e) =>
              setForm({
                ...form,
                [form.plan_category === "motjha"
                  ? "plan_members"
                  : "plan_age_bracket"]: e.target.value,
              })
            }
          >
            {form.plan_category === "motjha"
              ? [6, 10, 14].map((n) => (
                  <option key={n} value={n}>
                    {n} Members
                  </option>
                ))
              : ["18-65", "66-85", "86-100"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
          </select>
        )}
      </div>

      {/* 🆕 Service Type */}
      <div className="mt-6">
        <label className="font-semibold block mb-2 text-gray-700">
          Service Type:
        </label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="service_type"
              value="book"
              checked={form.service_type === "book"}
              onChange={(e) =>
                setForm({ ...form, service_type: e.target.value })
              }
            />
            <span>Book (Plan Price)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="service_type"
              value="private"
              checked={form.service_type === "private"}
              onChange={(e) =>
                setForm({ ...form, service_type: e.target.value })
              }
            />
            <span>Private (Manual Price)</span>
          </label>
        </div>
      </div>

      {/* 💵 Total Price */}
      <div className="mt-4 text-right font-bold text-tfs-red">
        {form.service_type === "book" ? (
          <>Total: R{displayedPrice}</>
        ) : (
          <div className="flex justify-end items-center gap-2">
            <span>Enter Total:</span>
            <input
              type="number"
              placeholder="R0.00"
              className="input w-40 text-right"
              value={form.total_price}
              onChange={(e) =>
                setForm({ ...form, total_price: e.target.value })
              }
            />
          </div>
        )}
      </div>

      {/* 📅 Funeral Info */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <input
          type="date"
          required
          className="input"
          value={form.funeral_date}
          onChange={(e) =>
            setForm({ ...form, funeral_date: e.target.value })
          }
        />
        <input
          type="time"
          required
          className="input"
          value={form.funeral_time}
          onChange={(e) =>
            setForm({ ...form, funeral_time: e.target.value })
          }
        />
        <input
          placeholder="Venue Name"
          className="input"
          value={form.venue_name}
          onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
        />
        <input
          placeholder="Full Address (GPS)"
          required
          className="input"
          value={form.venue_address}
          onChange={(e) =>
            setForm({ ...form, venue_address: e.target.value })
          }
        />
      </div>

      {/* ⚙️ Options */}
      <div className="mt-4 flex flex-col gap-2">
        <label>
          <input
            type="checkbox"
            checked={form.requires_cow}
            onChange={(e) =>
              setForm({ ...form, requires_cow: e.target.checked })
            }
          />{" "}
          Requires Cow (Kgomo)
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.requires_tombstone}
            onChange={(e) =>
              setForm({ ...form, requires_tombstone: e.target.checked })
            }
          />{" "}
          Requires Tombstone
        </label>
        <label>
          Intake Day:
          <input
            type="date"
            className="input mt-1"
            value={form.intake_day}
            onChange={(e) =>
              setForm({ ...form, intake_day: e.target.value })
            }
          />
        </label>
      </div>

      {/* 🧩 Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full btn-red text-lg"
      >
        {submitting ? "Submitting..." : "Reserve Stock & Add to Planner"}
      </button>

      {/* 📨 Message */}
      {message && (
        <p
          className={`mt-4 text-center font-semibold ${
            message.startsWith("✅")
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
