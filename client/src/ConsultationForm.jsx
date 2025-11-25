// src/components/ConsultationForm.jsx
import React, { useState } from 'react';
import { createCase } from './api/cases';

const PLAN_DATA = {
  motjha: {
    // Updated to match actual brochure prices
    'Budget Buster': { 6: 145, 10: 165, 14: 195 },
    'Plan A': { 6: 180, 10: 242, 14: 308 },
    'Plan B': { 6: 259, 10: 336, 14: 468 },
    'Plan C': { 6: 325, 10: 457, 14: 677 },
    'Plan D': { 6: 455, 10: 699 },
    'Plan E': { 6: 635, 10: 941 },
    'Plan F': { 6: 785, 10: 1363 },
    // Color-graded plans (latest plans)
    Green: { 6: 132, 10: 165, 14: 187 },
    Silver: { 6: 180, 10: 242, 14: 308 },
    Gold: { 6: 264, 10: 341, 14: 473 },
    Platinum: { 6: 330, 10: 462, 14: 682 },
    Black: { 6: 460, 10: 704 },
    Pearl: { 6: 640, 10: 946 },
    Ivory: { 6: 790, 10: 1368 },
  },
  single: {
    // Updated to match actual brochure prices
    'Budget Buster': { '18-65': 88, '66-85': 130, '86-100': 205 },
    'Plan A': { '18-65': 115, '66-85': 170, '86-100': 295 },
    'Plan B': { '18-65': 132, '66-85': 187, '86-100': 312 },
    'Plan C': { '18-65': 165, '66-85': 275, '86-100': 415 },
    'Plan D': { '18-65': 240, '66-85': 410 },
    'Plan E': { '18-65': 315 },
    'Plan F': { '18-65': 450 },
    // Color-graded plans (latest plans)
    Green: { '18-65': 45, '66-85': 80, '86-100': 105 },
    Silver: { '18-65': 88, '66-85': 130, '86-100': 205 },
    Gold: { '18-65': 132, '66-85': 187, '86-100': 312 },
    Platinum: { '18-65': 165, '66-85': 275, '86-100': 415 },
    Black: { '18-65': 240, '66-85': 410 },
    Pearl: { '18-65': 315 },
    Ivory: { '18-65': 450 }
  },
  family: {
    // Updated to match actual brochure prices
    'Budget Buster': { '18-65': 115, '66-85': 150, '86-100': 285 },
    'Plan A': { '18-65': 135, '66-85': 190, '86-100': 385 },
    'Plan B': { '18-65': 152, '66-85': 207, '86-100': 402 },
    'Plan C': { '18-65': 195, '66-85': 315, '86-100': 535 },
    'Plan D': { '18-65': 280, '66-85': 470 },
    'Plan E': { '18-65': 405 },
    'Plan F': { '18-65': 565 },
    // Color-graded plans (latest plans)
    Green: { '18-65': 65, '66-85': 90, '86-100': 145 },
    Silver: { '18-65': 115, '66-85': 150, '86-100': 285 },
    Gold: { '18-65': 152, '66-85': 207, '86-100': 402 },
    Platinum: { '18-65': 195, '66-85': 315, '86-100': 535 },
    Black: { '18-65': 280, '66-85': 470 },
    Pearl: { '18-65': 405 },
    Ivory: { '18-65': 565 }
  },
  specials: {
    'Spring A': { 6: 120, 10: 180 },
    'Spring B': { 6: 125, 10: 203 }
  }
};

// Plan benefits based on brochure
const PLAN_BENEFITS = {
  'Budget Buster': {
    casket: "Flat Lid Coffin",
    tent: 1,
    table: 1,
    toilet: 1,
    chairs: 50,
    programmes: 50,
    service: "1 Service (Incl. Hearse & Family Car & Deco)"
  },
  'Plan A': {
    casket: "Three Tier Coffin",
    tent: 1,
    table: 1,
    toilet: 1,
    chairs: 50,
    programmes: 100,
    crucifix: 1,
    airtime: 100,
    cashback: 2000,
    service: "1 Service (Incl. Hearse & Family Car & Deco)"
  },
  'Plan B': {
    casket: "Dutch Economy Casket",
    tent: 1,
    table: 1,
    toilet: 1,
    chairs: 50,
    programmes: 100,
    crucifix: 1,
    flower: 1,
    airtime: 100,
    cashback: 2000,
    service: "1 Service (Incl. Hearse & Family Car & Deco)"
  },
  'Plan C': {
    casket: "Pongee Casket",
    tent: 1,
    table: 2,
    toilet: 1,
    chairs: 100,
    programmes: 100,
    crucifix: 1,
    flower: 1,
    airtime: 100,
    cashback: 4000,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  'Plan D': {
    casket: "Raised Halfview Casket",
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 100,
    programmes: 100,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    cashback: 5000,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  'Plan E': {
    casket: "Four Tier Casket",
    tombstone: "1 Tombstone (Head)",
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 200,
    programmes: 150,
    flower: 2,
    airtime: 200,
    cashback: 6000,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  'Plan F': {
    casket: "Four CNR Figurine Casket",
    tombstone: "1 Tombstone (Head & Slab)",
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 200,
    catering: 1,
    programmes: 150,
    flower: 4,
    airtime: 200,
    cashback: 0,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  // Color-graded plans (latest plans with color grading)
  Green: {
    casket: "15L Juice, 40 Lt Cakes, Groceries or Vegetables",
    cover: 5000,
    tent: 1,
    table: 1,
    toilet: 1,
    chairs: 50,
    programmes: 50,
    service: "1 Service (Incl. Hearse & Family Car & Deco)"
  },
  Silver: {
    casket: "Economy Casket",
    cover: 10000,
    grocery: "Groceries or Vegetables",
    tent: 1,
    table: 1,
    toilet: 1,
    chairs: 50,
    programmes: 50,
    crucifix: 1,
    airtime: 100,
    service: "1 Service (Incl. Hearse & Family Car & Deco)"
  },
  Gold: {
    casket: "Pongee Casket",
    cover: 15000,
    grocery: "Groceries or Vegetables",
    tent: 1,
    table: 2,
    toilet: 1,
    chairs: 100,
    programmes: 100,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  Platinum: {
    casket: "Raised HalfView Casket",
    cover: 20000,
    grocery: "Groceries or Vegetables",
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 100,
    programmes: 100,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  Black: {
    casket: "Four Tier Casket",
    cover: 30000,
    grocery: "Groceries or Vegetables",
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 150,
    programmes: 100,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  Pearl: {
    casket: "Princeton Dome Casket",
    cover: 40000,
    grocery: "Groceries or Vegetables",
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 200,
    programmes: 150,
    crucifix: 1,
    flower: 2,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  Ivory: {
    casket: "Four CNR Figurine",
    cover: 50000,
    grocery: "Groceries or Vegetables",
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 200,
    programmes: 150,
    crucifix: 1,
    flower: 4,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
};

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

// LEGACY PLAN MAPPING — Maps old brochure plan names to new system plan names
// Based on actual brochure prices from the image
const LEGACY_PLAN_MAPPING = {
  // MOTJHA O TJHELE / SOCIETY PLANS
  "BUDGET BUSTER (MOTJHA)": { category: "motjha", name: "Budget Buster", members: 6 },
  "PLAN A (MOTJHA)": { category: "motjha", name: "Plan A", members: 6 },
  "PLAN B (MOTJHA)": { category: "motjha", name: "Plan B", members: 6 },
  "PLAN C (MOTJHA)": { category: "motjha", name: "Plan C", members: 6 },
  "PLAN D (MOTJHA)": { category: "motjha", name: "Plan D", members: 6 },
  "PLAN E (MOTJHA)": { category: "motjha", name: "Plan E", members: 6 },
  "PLAN F (MOTJHA)": { category: "motjha", name: "Plan F", members: 6 },

  // MOTJHA with 10 members
  "BUDGET BUSTER (MOTJHA 10)": { category: "motjha", name: "Budget Buster", members: 10 },
  "PLAN A (MOTJHA 10)": { category: "motjha", name: "Plan A", members: 10 },
  "PLAN B (MOTJHA 10)": { category: "motjha", name: "Plan B", members: 10 },
  "PLAN C (MOTJHA 10)": { category: "motjha", name: "Plan C", members: 10 },
  "PLAN D (MOTJHA 10)": { category: "motjha", name: "Plan D", members: 10 },
  "PLAN E (MOTJHA 10)": { category: "motjha", name: "Plan E", members: 10 },
  "PLAN F (MOTJHA 10)": { category: "motjha", name: "Plan F", members: 10 },

  // FAMILY PLANS (Most common)
  "BUDGET BUSTER (FAMILY)": { category: "family", name: "Budget Buster", age: "18-65" },
  "PLAN A (FAMILY)": { category: "family", name: "Plan A", age: "18-65" },
  "PLAN B (FAMILY)": { category: "family", name: "Plan B", age: "18-65" },
  "PLAN C (FAMILY)": { category: "family", name: "Plan C", age: "18-65" },
  "PLAN D (FAMILY)": { category: "family", name: "Plan D", age: "18-65" },
  "PLAN E (FAMILY)": { category: "family", name: "Plan E", age: "18-65" },
  "PLAN F (FAMILY)": { category: "family", name: "Plan F", age: "18-65" },

  // SINGLE PLANS
  "BUDGET BUSTER (SINGLE)": { category: "single", name: "Budget Buster", age: "18-65" },
  "PLAN A (SINGLE)": { category: "single", name: "Plan A", age: "18-65" },
  "PLAN B (SINGLE)": { category: "single", name: "Plan B", age: "18-65" },
  "PLAN C (SINGLE)": { category: "single", name: "Plan C", age: "18-65" },
  "PLAN D (SINGLE)": { category: "single", name: "Plan D", age: "18-65" },
  "PLAN E (SINGLE)": { category: "single", name: "Plan E", age: "18-65" },
  "PLAN F (SINGLE)": { category: "single", name: "Plan F", age: "18-65" },

  // SPRING SPECIALS
  "SPRING A": { category: "specials", name: "Spring A", members: 6 },
  "SPRING B": { category: "specials", name: "Spring B", members: 6 },
};

export default function ConsultationForm() {
  const [form, setForm] = useState({
    plan_category: 'family',
    plan_name: 'Budget Buster', // Updated to match brochure plan names
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
    requires_catering: false,
    requires_grocery: false,
    requires_bus: false,
    intake_day: '',
    service_type: 'book',
    total_price: '',
    casket_type: '',
    casket_colour: ''
  });

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getAutoPrice = () => {
    if (form.plan_category === 'colour_grade') return 0;
    const plan = PLAN_DATA[form.plan_category]?.[form.plan_name];
    const key = form.plan_category === 'motjha' || form.plan_category === 'specials'
      ? form.plan_members
      : form.plan_age_bracket;
    return plan?.[key] || 0;
  };

  const displayedPrice = form.service_type === 'book' ? getAutoPrice() : form.total_price || '';

  const getAutoCasketType = () => {
    if (form.plan_category === 'specials') {
      return SPECIAL_PLAN_BENEFITS[form.plan_name]?.casket || '';
    }
    // Check new plan benefits first, then legacy color grades
    return form.casket_type || PLAN_BENEFITS[form.plan_name]?.casket || '';
  };

  const isSpecialPlan = form.plan_category === 'specials';

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLegacyPlanSelect = (legacyName) => {
    const mapping = LEGACY_PLAN_MAPPING[legacyName];
    if (!mapping) return;

    setForm(prev => ({
      ...prev,
      plan_category: mapping.category,
      plan_name: mapping.name,
      plan_members: mapping.members || prev.plan_members,
      plan_age_bracket: mapping.age || prev.plan_age_bracket
    }));
  };

  const getLegacyPlanName = () => {
    return Object.keys(LEGACY_PLAN_MAPPING).find(key => {
      const m = LEGACY_PLAN_MAPPING[key];
      return m.category === form.plan_category &&
        m.name === form.plan_name &&
        (!m.age || m.age === form.plan_age_bracket) &&
        (!m.members || m.members === form.plan_members);
    }) || null;
  };

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
      status: 'intake',
      legacy_plan_name: getLegacyPlanName() || null
    };

    try {
      await createCase(data);
      setMessage('Case submitted successfully!');
      // Reset form (keep defaults)
      setForm(prev => ({
        ...prev,
        deceased_name: '', deceased_id: '', nok_name: '', nok_contact: '', nok_relation: '',
        funeral_date: '', funeral_time: '', delivery_date: '', delivery_time: '',
        venue_name: '', venue_address: '', intake_day: '',
        requires_cow: false, requires_tombstone: false,
        requires_catering: false, requires_grocery: false, requires_bus: false,
        total_price: '', casket_type: '', casket_colour: ''
      }));
    } catch (err) {
      setMessage(`Failed to submit: ${err.message || err.response?.data?.error || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
        <div className="text-center mb-8">
          {/* <h1 className="text-5xl font-bold text-red-800 mb-2">THUSANANG FUNERAL SERVICES</h1> */}
          <p className="text-yellow-600 text-xl font-semibold mb-6">Live from QwaQwa • Re tšotella sechaba sa rona</p>
          <h2 className="text-3xl font-bold text-red-700">Wednesday Family Consultation</h2>
          <p className="text-gray-600 mt-2">Complete the form below to create a new case</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* DECEASED & NEXT OF KIN */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">1</span>
              Deceased & Next of Kin Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label>Deceased Full Name <span className="text-red-600">*</span></label><input required value={form.deceased_name} onChange={e => handleInputChange('deceased_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Enter deceased name" /></div>
              <div><label>ID Number</label><input value={form.deceased_id} onChange={e => handleInputChange('deceased_id', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Next of Kin Name <span className="text-red-600">*</span></label><input required value={form.nok_name} onChange={e => handleInputChange('nok_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Contact Number <span className="text-red-600">*</span></label><input required value={form.nok_contact} onChange={e => handleInputChange('nok_contact', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Relationship</label><input value={form.nok_relation} onChange={e => handleInputChange('nok_relation', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="e.g., Spouse, Child" /></div>
            </div>
          </div>

          {/* PLAN SELECTION — SMART WITH LEGACY SUPPORT */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>
              Plan Selection & Pricing
            </h3>

            {/* Quick Legacy Plan Selector */}
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
              <label className="block text-sm font-bold text-amber-900 mb-3">
                📋 Quick Select: Brochure Plan Name (Optional)
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleLegacyPlanSelect(e.target.value);
                    e.target.value = ''; // Reset dropdown after selection
                  }
                }}
                className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg text-lg font-medium focus:ring-4 focus:ring-amber-300"
                defaultValue=""
              >
                <option value="">– Select from brochure (auto-fills below) –</option>
                <optgroup label="Motjha O Tlhele / Society Plans">
                  {Object.keys(LEGACY_PLAN_MAPPING).filter(k => k.includes('MOTJHA')).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </optgroup>
                <optgroup label="Family Plans">
                  {Object.keys(LEGACY_PLAN_MAPPING).filter(k => k.includes('FAMILY')).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </optgroup>
                <optgroup label="Single Plans">
                  {Object.keys(LEGACY_PLAN_MAPPING).filter(k => k.includes('SINGLE')).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </optgroup>
                <optgroup label="Spring Specials">
                  {Object.keys(LEGACY_PLAN_MAPPING).filter(k => k.includes('SPRING')).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-amber-700 mt-2">
                💡 Select a plan from the brochure to automatically configure Category, Grade, Members/Age below
              </p>
            </div>

            {/* Current Plan Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select value={form.plan_category} onChange={(e) => {
                  const cat = e.target.value;
                  // Set default plan name based on category
                  const defaultName = cat === 'specials' ? 'Spring A' :
                    cat === 'motjha' ? 'Budget Buster' :
                      cat === 'single' ? 'Budget Buster' :
                        'Budget Buster'; // family default
                  setForm(prev => ({ ...prev, plan_category: cat, plan_name: defaultName }));
                }} className="w-full px-4 py-3 border rounded-lg">
                  <option value="motjha">Motjha O Tlhele</option>
                  <option value="single">Single Plan</option>
                  <option value="family">Family Plan</option>
                  <option value="specials">Spring Specials</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Grade</label>
                <select value={form.plan_name} onChange={e => handleInputChange('plan_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg bg-gray-50">
                  {Object.keys(PLAN_DATA[form.plan_category] || {}).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {(form.plan_category === 'motjha' || form.plan_category === 'specials') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Members</label>
                  <select value={form.plan_members} onChange={e => handleInputChange('plan_members', parseInt(e.target.value))} className="w-full px-4 py-3 border rounded-lg">
                    {[6, 10, 14].map(n => <option key={n} value={n}>{n} Members</option>)}
                  </select>
                </div>
              )}

              {(form.plan_category === 'single' || form.plan_category === 'family') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Age Bracket</label>
                  <select value={form.plan_age_bracket} onChange={e => handleInputChange('plan_age_bracket', e.target.value)} className="w-full px-4 py-3 border rounded-lg">
                    <option value="18-65">18–65 yrs</option>
                    <option value="66-85">66–85 yrs</option>
                    <option value="86-100">86–100 yrs</option>
                  </select>
                </div>
              )}
            </div>

            {/* Show Selected Plan Summary */}
            {form.plan_name && (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-5 mb-6">
                <p className="font-bold text-blue-900 mb-2">
                  Selected Plan: <span className="text-xl">{form.plan_name}</span>
                  {getLegacyPlanName() && <span className="ml-3 text-green-700 text-sm">(Brochure: {getLegacyPlanName()})</span>}
                </p>
                <p className="text-sm text-blue-700 mb-2">
                  {form.plan_category === 'motjha' && `${form.plan_members} members`}
                  {form.plan_category === 'family' && `Family • ${form.plan_age_bracket} years`}
                  {form.plan_category === 'single' && `Single • ${form.plan_age_bracket} years`}
                  {form.plan_category === 'specials' && `Special Offer • ${form.plan_members} members`}
                </p>
                {/* Show plan benefits if available */}
                {PLAN_BENEFITS[form.plan_name] && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    {PLAN_BENEFITS[form.plan_name].cover && (
                      <p className="text-sm font-bold text-blue-900 mb-2">
                        Cover Amount: R{PLAN_BENEFITS[form.plan_name].cover.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-blue-800 mb-1">Includes:</p>
                    <p className="text-xs text-blue-700">
                      {PLAN_BENEFITS[form.plan_name].casket}
                      {PLAN_BENEFITS[form.plan_name].tombstone && ` • ${PLAN_BENEFITS[form.plan_name].tombstone}`}
                      {PLAN_BENEFITS[form.plan_name].tent && ` • ${PLAN_BENEFITS[form.plan_name].tent} Tent`}
                      {PLAN_BENEFITS[form.plan_name].chairs && ` • ${PLAN_BENEFITS[form.plan_name].chairs} Chairs`}
                      {PLAN_BENEFITS[form.plan_name].grocery && ` • ${PLAN_BENEFITS[form.plan_name].grocery}`}
                      {PLAN_BENEFITS[form.plan_name].cashback && ` • R${PLAN_BENEFITS[form.plan_name].cashback} Cashback`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Special Benefits */}
            {isSpecialPlan && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                <h4 className="font-bold text-green-800 text-lg mb-3">{form.plan_name} Benefits:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• {SPECIAL_PLAN_BENEFITS[form.plan_name].casket}</li>
                  {SPECIAL_PLAN_BENEFITS[form.plan_name].benefits.map((b, i) => <li key={i}>• {b}</li>)}
                </ul>
              </div>
            )}

            {/* Service Type & Price */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <label className="block font-semibold mb-4">Service Type:</label>
              <div className="flex gap-8 mb-6">
                <label className="flex items-center"><input type="radio" name="service_type" value="book" checked={form.service_type === 'book'} onChange={e => handleInputChange('service_type', e.target.value)} className="mr-3" /><span className="font-medium">Book (Plan Price)</span></label>
                <label className="flex items-center"><input type="radio" name="service_type" value="private" checked={form.service_type === 'private'} onChange={e => handleInputChange('service_type', e.target.value)} className="mr-3" /><span className="font-medium">Private (Manual Price)</span></label>
              </div>

              <div className="flex justify-between items-center bg-white p-5 rounded-lg border-2 border-gray-300">
                <span className="text-xl font-bold">Total Price:</span>
                {form.service_type === 'book' ? (
                  <span className="text-3xl font-bold text-green-600">R{displayedPrice}</span>
                ) : (
                  <input type="number" placeholder="0.00" value={form.total_price} onChange={e => handleInputChange('total_price', e.target.value)} className="w-40 px-4 py-3 border-2 rounded-lg text-right text-2xl font-bold" />
                )}
              </div>
            </div>
          </div>

          {/* CASKET & DELIVERY */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>
              Casket & Delivery Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label>Casket Type</label>
                {isSpecialPlan ? (
                  <div className="w-full px-4 py-3 bg-green-50 border border-green-300 rounded-lg font-bold text-green-800">
                    {getAutoCasketType()} (Included)
                  </div>
                ) : (
                  <input value={getAutoCasketType()} onChange={e => handleInputChange('casket_type', e.target.value)} className="w-full px-4 py-3 border rounded-lg" />
                )}
              </div>
              <div><label>Casket Colour</label><input value={form.casket_colour} onChange={e => handleInputChange('casket_colour', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Delivery Date</label><input type="date" value={form.delivery_date} onChange={e => handleInputChange('delivery_date', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Delivery Time</label><input type="time" value={form.delivery_time} onChange={e => handleInputChange('delivery_time', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
            </div>
          </div>

          {/* FUNERAL DETAILS */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">4</span>
              Funeral Service Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label>Funeral Date <span className="text-red-600">*</span></label><input type="date" required value={form.funeral_date} onChange={e => handleInputChange('funeral_date', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Funeral Time <span className="text-red-600">*</span></label><input type="time" required value={form.funeral_time} onChange={e => handleInputChange('funeral_time', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Venue Name</label><input value={form.venue_name} onChange={e => handleInputChange('venue_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Full Address (GPS) <span className="text-red-600">*</span></label><input required value={form.venue_address} onChange={e => handleInputChange('venue_address', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
            </div>
          </div>

          {/* ADDITIONAL OPTIONS */}
          <div className="p-8">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">5</span>
              Additional Services
            </h3>
            <div className="space-y-4">
              <label className="flex items-center"><input type="checkbox" checked={form.requires_cow} onChange={e => handleInputChange('requires_cow', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Requires Cow (Kgomo)</span></label>
              <label className="flex items-center"><input type="checkbox" checked={form.requires_tombstone} onChange={e => handleInputChange('requires_tombstone', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Requires Tombstone</span></label>
              <label className="flex items-center"><input type="checkbox" checked={form.requires_catering} onChange={e => handleInputChange('requires_catering', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Catering</span></label>
              <label className="flex items-center"><input type="checkbox" checked={form.requires_grocery} onChange={e => handleInputChange('requires_grocery', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Grocery</span></label>
              <label className="flex items-center"><input type="checkbox" checked={form.requires_bus} onChange={e => handleInputChange('requires_bus', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Bus</span></label>
              <div><label>Intake Day</label><input type="date" value={form.intake_day} onChange={e => handleInputChange('intake_day', e.target.value)} className="w-full px-4 py-3 border rounded-lg mt-2" /></div>
            </div>
          </div>

          {/* SUBMIT */}
          <div className="p-8 bg-gray-50 border-t">
            <button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-5 rounded-xl text-xl transition flex items-center justify-center">
              {submitting ? "Submitting..." : "Submit Case"}
            </button>
            {message && (
              <div className={`mt-4 p-4 rounded-lg text-center font-bold ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message}
              </div>
            )}
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Toll Free: <span className="font-bold text-red-600">0800 01 4574</span> | Serving with Dignity</p>
        </div>
      </div>
    </div>
  );
}