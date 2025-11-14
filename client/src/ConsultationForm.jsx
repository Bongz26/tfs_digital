// src/components/ConsultationForm.jsx
import React, { useState } from 'react';

const PLAN_DATA = {
  motjha: {
    Green: { 6: 132, 10: 165, 14: 187 },
    Silver: { 6: 180, 10: 242, 14: 308 },
    Gold: { 6: 264, 10: 341, 14: 473 }
  },
  single: {
    Green: { '18-65': 45, '66-85': 80, '86-100': 105 },
    Silver: { '18-65': 88, '66-85': 130, '86-100': 205 },
    Gold: { '18-65': 132, '66-85': 187, '86-100': 312 },
    Platinum: { '18-65': 165, '66-85': 275, '86-100': 415 },
    Black: { '18-65': 240, '66-85': 410 },
    Pearl: { '18-65': 405 },
    Ivory: { '18-65': 450 }
  },
  family: {
    Green: { '18-65': 65, '66-85': 90, '86-100': 145 },
    Silver: { '18-65': 115, '66-85': 150, '86-100': 285 },
    Gold: { '18-65': 152, '66-85': 207, '86-100': 402 },
    Platinum: { '18-65': 195, '66-85': 315, '86-100': 535 },
    Black: { '18-65': 280, '66-85': 470 },
    Pearl: { '18-65': 455 },
    Ivory: { '18-65': 565 }
  },
  // ✅ ADDED SPECIAL SPRING PLANS
  specials: {
    'Spring A': { 6: 120, 10: 180 },
    'Spring B': { 6: 125, 10: 203 }
  }
};

const COLOUR_GRADE = {
  Green: { casket: "Bedwood", tent: 1, chairs: 50, grocery: 100 },
  Silver: { casket: "Crucifix", tent: 1, chairs: 100, grocery: 100 },
  Gold: { casket: "Raised Halfview", tent: 1, chairs: 100, grocery: 100 },
  Platinum: { casket: "4-Tier", tent: 1, chairs: 100, grocery: 100 },
  Black: { casket: "Princeton Dome", tent: 1, chairs: 100, grocery: 150 },
  Pearl: { casket: "Royal Dome", tent: 1, chairs: 200, grocery: 100 },
  Ivory: { casket: "Tombstone", tent: 1, chairs: 200, grocery: 100 }
};

// ✅ ADDED SPECIAL PLAN BENEFITS
const SPECIAL_PLAN_BENEFITS = {
  'Spring A': {
    casket: "3-Tier Coffin",
    benefits: [
      "Full Service (Includes Fleet & Graveyard Setup)",
      "Tent, Table & Toilet",
      "50 Chairs",
      "50 Programmes", 
      "R100 Airtime",
      "Storage & Collection within 80km radius"
    ]
  },
  'Spring B': {
    casket: "Econo Casket",
    benefits: [
      "Full Service (Includes Fleet & Graveyard Setup)",
      "Tent, Table & Toilet", 
      "80 Chairs",
      "Grocery Package",
      "80 Programmes",
      "Crucifix",
      "Storage & Collection within 80km radius"
    ]
  }
};

export default function ConsultationForm() {
  const [form, setForm] = useState({
    plan_category: 'motjha',
    plan_name: 'Green',
    plan_members: 6,
    plan_age_bracket: '18-65',
    deceased_name: '',
    deceased_id: '',
    nok_name: '',
    nok_contact: '',
    nok_relation: '',
    funeral_date: '',
    funeral_time: '',
    delivery_date: '',
    delivery_time: '',
    venue_name: '',
    venue_address: '',
    requires_cow: false,
    requires_tombstone: false,
    intake_day: '',
    service_type: 'book',
    total_price: '',
    casket_type: '',
    casket_colour: ''
  });

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const getAutoPrice = () => {
    if (form.plan_category === 'colour_grade') return 0;
    const plan = PLAN_DATA[form.plan_category][form.plan_name];
    const key = form.plan_category === 'motjha' || form.plan_category === 'specials' ? form.plan_members : form.plan_age_bracket;
    return plan?.[key] || 0;
  };

  const displayedPrice = form.service_type === 'book' ? getAutoPrice() : form.total_price || '';

  // ✅ Get auto casket type based on plan selection
  const getAutoCasketType = () => {
    if (form.plan_category === 'specials') {
      return SPECIAL_PLAN_BENEFITS[form.plan_name]?.casket || '';
    }
    return form.casket_type || COLOUR_GRADE[form.plan_name]?.casket || '';
  };

  // ✅ Check if current plan is a special plan
  const isSpecialPlan = form.plan_category === 'specials';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    const data = {
      ...form,
      total_price: form.service_type === 'book' ? getAutoPrice() : parseFloat(form.total_price) || 0,
      casket_type: getAutoCasketType(),
      venue_lat: null,
      venue_lng: null,
      status: 'intake'
    };

    try {
      const res = await fetch(`${API_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}`);
      }

      setMessage('✅ Case submitted successfully!');
      setForm({
        plan_category: 'motjha',
        plan_name: 'Green',
        plan_members: 6,
        plan_age_bracket: '18-65',
        deceased_name: '',
        deceased_id: '',
        nok_name: '',
        nok_contact: '',
        nok_relation: '',
        funeral_date: '',
        funeral_time: '',
        delivery_date: '',
        delivery_time: '',
        venue_name: '',
        venue_address: '',
        requires_cow: false,
        requires_tombstone: false,
        intake_day: '',
        service_type: 'book',
        total_price: '',
        casket_type: '',
        casket_colour: ''
      });
    } catch (err) {
      console.error('Submit error:', err);
      setMessage('❌ Failed to submit data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const InputField = ({ 
    label, 
    type = "text", 
    placeholder, 
    value, 
    onChange, 
    required = false, 
    className = "", 
    disabled = false,
    readOnly = false 
  }) => (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition ${
          disabled || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      />
    </div>
  );

  const SelectField = ({ label, value, onChange, children, className = "" }) => (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
      >
        {children}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-red-800 mb-2">
            THUSANANG FUNERAL SERVICES
          </h1>
          <p className="text-yellow-600 text-xl font-semibold mb-6">
            Live from QwaQwa • Re tšotella sechaba sa rona
          </p>
          <h2 className="text-3xl font-bold text-red-700">
            Wednesday Family Consultation
          </h2>
          <p className="text-gray-600 mt-2">Complete the form below to create a new case</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          
          {/* DECEASED & NEXT OF KIN SECTION */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">1</span>
              Deceased & Next of Kin Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Deceased Full Name"
                placeholder="Enter deceased name"
                required
                value={form.deceased_name}
                onChange={e => setForm({...form, deceased_name: e.target.value})}
              />
              <InputField
                label="ID Number"
                placeholder="Enter ID number"
                value={form.deceased_id}
                onChange={e => setForm({...form, deceased_id: e.target.value})}
              />
              <InputField
                label="Next of Kin Name"
                placeholder="Enter next of kin name"
                required
                value={form.nok_name}
                onChange={e => setForm({...form, nok_name: e.target.value})}
              />
              <InputField
                label="Contact Number"
                placeholder="Enter contact number"
                required
                value={form.nok_contact}
                onChange={e => setForm({...form, nok_contact: e.target.value})}
              />
              <InputField
                label="Relationship to Deceased"
                placeholder="e.g., Spouse, Child, Sibling"
                value={form.nok_relation}
                onChange={e => setForm({...form, nok_relation: e.target.value})}
              />
            </div>
          </div>

          {/* PLAN SELECTION SECTION */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>
              Plan Selection & Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <SelectField
                label="Plan Category"
                value={form.plan_category}
                onChange={e => setForm({...form, plan_category: e.target.value, plan_name: e.target.value === 'specials' ? 'Spring A' : 'Green'})}
              >
                <option value="motjha">Motjha O Tlhele</option>
                <option value="single">Single Plan</option>
                <option value="family">Family Plan</option>
                <option value="specials">Special Spring Plans</option>
                <option value="colour_grade">Colour Grade</option>
              </SelectField>

              <SelectField
                label="Plan Name"
                value={form.plan_name}
                onChange={e => setForm({...form, plan_name: e.target.value})}
              >
                {Object.keys(form.plan_category === 'colour_grade' ? COLOUR_GRADE : PLAN_DATA[form.plan_category]).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </SelectField>

              {(form.plan_category === 'motjha' || form.plan_category === 'specials') && (
                <SelectField
                  label="Members"
                  value={form.plan_members}
                  onChange={e => setForm({...form, plan_members: e.target.value})}
                >
                  {[6, 10].map(n => <option key={n} value={n}>{n} Members</option>)}
                </SelectField>
              )}

              {(form.plan_category === 'single' || form.plan_category === 'family') && (
                <SelectField
                  label="Age Bracket"
                  value={form.plan_age_bracket}
                  onChange={e => setForm({...form, plan_age_bracket: e.target.value})}
                >
                  {['18-65', '66-85', '86-100'].map(a => <option key={a} value={a}>{a} Years</option>)}
                </SelectField>
              )}
            </div>

            {/* ✅ SPECIAL PLAN BENEFITS DISPLAY */}
            {isSpecialPlan && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                <h4 className="font-bold text-green-800 text-lg mb-3">
                  🎁 {form.plan_name} Benefits Included:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-green-700 mb-2">Main Benefits:</p>
                    <ul className="text-sm text-green-600 space-y-1">
                      <li>• {SPECIAL_PLAN_BENEFITS[form.plan_name]?.casket}</li>
                      <li>• Full Service (Fleet & Graveyard Setup)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-green-700 mb-2">Value Adds:</p>
                    <ul className="text-sm text-green-600 space-y-1">
                      {SPECIAL_PLAN_BENEFITS[form.plan_name]?.benefits.map((benefit, index) => (
                        <li key={index}>• {benefit}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SERVICE TYPE & PRICING */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <label className="block text-sm font-semibold text-gray-700 mb-4">Service Type:</label>
              <div className="flex gap-8 mb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="service_type" 
                    value="book" 
                    checked={form.service_type === 'book'} 
                    onChange={e => setForm({...form, service_type: e.target.value})}
                    className="w-5 h-5 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700 font-medium">Book (Plan Price)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="service_type" 
                    value="private" 
                    checked={form.service_type === 'private'} 
                    onChange={e => setForm({...form, service_type: e.target.value})}
                    className="w-5 h-5 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700 font-medium">Private (Manual Price)</span>
                </label>
              </div>

              <div className="flex justify-between items-center bg-white p-4 rounded-lg border">
                <span className="text-lg font-semibold text-gray-700">Total Price:</span>
                {form.service_type === 'book' ? (
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">R{displayedPrice}</span>
                    {isSpecialPlan && (
                      <p className="text-sm text-green-600 mt-1">
                        For {form.plan_members} members
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">R</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={form.total_price} 
                      onChange={e => setForm({...form, total_price: e.target.value})}
                      className="w-32 px-3 py-2 border border-gray-300 rounded text-right text-lg font-semibold focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CASKET & DELIVERY SECTION */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>
              Casket & Delivery Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Casket / Coffin Type"
                placeholder="e.g., Bedwood, Crucifix, Princeton Dome"
                value={getAutoCasketType()}
                onChange={e => setForm({...form, casket_type: e.target.value})}
                disabled={isSpecialPlan}
              />
              <InputField
                label="Casket Colour"
                placeholder="Enter casket colour"
                value={form.casket_colour}
                onChange={e => setForm({...form, casket_colour: e.target.value})}
              />
              <InputField
                label="Delivery Date"
                type="date"
                value={form.delivery_date}
                onChange={e => setForm({...form, delivery_date: e.target.value})}
              />
              <InputField
                label="Delivery Time"
                type="time"
                value={form.delivery_time}
                onChange={e => setForm({...form, delivery_time: e.target.value})}
              />
            </div>
            {isSpecialPlan && (
              <p className="text-sm text-green-600 mt-2">
                ✅ Casket type automatically set to {SPECIAL_PLAN_BENEFITS[form.plan_name]?.casket} for {form.plan_name}
              </p>
            )}
          </div>

          {/* FUNERAL DETAILS SECTION */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">4</span>
              Funeral Service Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Funeral Date"
                type="date"
                required
                value={form.funeral_date}
                onChange={e => setForm({...form, funeral_date: e.target.value})}
              />
              <InputField
                label="Funeral Time"
                type="time"
                required
                value={form.funeral_time}
                onChange={e => setForm({...form, funeral_time: e.target.value})}
              />
              <InputField
                label="Venue Name"
                placeholder="e.g., Local Church, Community Hall"
                value={form.venue_name}
                onChange={e => setForm({...form, venue_name: e.target.value})}
              />
              <InputField
                label="Full Address (GPS)"
                placeholder="Enter complete venue address"
                required
                value={form.venue_address}
                onChange={e => setForm({...form, venue_address: e.target.value})}
              />
            </div>
          </div>

          {/* ADDITIONAL OPTIONS */}
          <div className="p-8">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">5</span>
              Additional Services & Information
            </h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.requires_cow} 
                  onChange={e => setForm({...form, requires_cow: e.target.checked})}
                  className="w-5 h-5 text-red-600 focus:ring-red-500 rounded"
                />
                <span className="text-gray-700 font-medium">Requires Cow (Kgomo)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.requires_tombstone} 
                  onChange={e => setForm({...form, requires_tombstone: e.target.checked})}
                  className="w-5 h-5 text-red-600 focus:ring-red-500 rounded"
                />
                <span className="text-gray-700 font-medium">Requires Tombstone</span>
              </label>
              <div className="mt-4">
                <InputField
                  label="Intake Day"
                  type="date"
                  value={form.intake_day}
                  onChange={e => setForm({...form, intake_day: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="p-8 bg-gray-50 border-t border-gray-200">
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition duration-200 flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Reserve Stock & Add to Planner"
              )}
            </button>

            {message && (
              <div className={`mt-4 p-4 rounded-lg text-center font-semibold ${
                message.startsWith("✅") 
                  ? "bg-green-100 text-green-700 border border-green-200" 
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}>
                {message}
              </div>
            )}
          </div>
        </form>

        {/* FOOTER */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Toll Free: <span className="font-bold text-red-600">0800 01 4574</span> | Serving with Dignity
          </p>
        </div>
      </div>
    </div>
  );
}