// src/components/ConsultationForm.jsx
import React, { useState, useEffect } from 'react';
import { createCase, lookupCase } from './api/cases';
import { createAirtimeRequest } from './api/sms';
import { saveDraft as saveDraftServer, getDraftByPolicy as getDraftServer, getLastDraft as getLastDraftServer, deleteDraftByPolicy as deleteDraftServer, listDrafts as listDraftsServer } from './api/claimDrafts';

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
    cover: 5000,
    juice_liters: 15,
    cakes_liters: 40,
    grocery_items: ["Rice", "Maize", "Sugar", "Oil", "Tea", "Cremora"]
  },
  Silver: {
    casket: "Economy Casket",
    cover: 10000,
    grocery_items: ["Rice", "Maize", "Sugar", "Oil", "Tea", "Cremora"],
    tent: 1,
    table: 1,
    toilet: 1,
    chairs: 50,
    programmes: 50,
    crucifix: 1,
    airtime: 100,
    service: "1 Service (Incl. Hearse & Family Car)"
  },
  Gold: {
    casket: "Pongee Casket",
    cover: 15000,
    grocery_items: ["Rice", "Maize", "Sugar", "Oil", "Tea", "Cremora"],
    tent: 1,
    table: 2,
    toilet: 1,
    chairs: 100,
    programmes: 100,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Cars)"

  },
  Platinum: {
    casket: "Raised HalfView Casket",
    cover: 20000,
    grocery_items: ["Rice", "Maize", "Sugar", "Oil", "Tea", "Cremora"],
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 100,
    programmes: 100,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Cars)"
  },
  Black: {
    casket: "Four Tier Casket",
    cover: 30000,
    grocery_items: ["Rice", "Maize", "Sugar", "Oil", "Tea", "Cremora"],
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 150,
    programmes: 150,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Car)"
  },
  Pearl: {
    casket: "Princeton Dome Casket",
    cover: 40000,
    grocery_items: ["Rice", "Maize", "Sugar", "Oil", "Tea", "Cremora"],
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 200,
    programmes: 150,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
  Ivory: {
    casket: "Four CNR Figurine",
    cover: 50000,
    grocery_items: ["Rice", "Maize", "Sugar", "Oil", "Tea", "Cremora"],
    tent: 1,
    table: 2,
    toilet: "VIP",
    chairs: 200,
    programmes: 150,
    crucifix: 1,
    flower: 1,
    airtime: 200,
    tombstone:1,
    cow:1,
    service: "1 Service (Incl. Hearse & Family Cars & Deco)"
  },
};

const SPECIAL_PLAN_BENEFITS = {
  'Spring A': {
    cover: 6500,
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
    cover: 6500,
    casket: "Econo Casket",
    benefits: [
      "Full Service (Includes Fleet & Graveyard Setup)",
      "Tent, Table & Toilet",
      "80 Chairs",
      "Grocery (Rice, Maize, Sugar, Oil, Tea, Cremora)",
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
    plan_name: 'Budget Buster',
    plan_members: 6,
    plan_age_bracket: '18-65',
    benefit_mode: 'benefits',
    pearl_bonus: '',
    claim_date: '',
    policy_number: '',
    deceased_name: '',
    deceased_id: '',
    nok_name: '',
    nok_contact: '',
    nok_relation: '',
    cleansing_date: '',
    cleansing_time: '',
    delivery_date: '',
    delivery_time: '',
    service_date: '',
    service_time: '',
    church_date: '',
    church_time: '',
    venue_name: '',
    venue_address: '',
    requires_cow: false,
    requires_sheep: false,
    requires_tombstone: false,
    requires_flower: false,
    requires_catering: false,
    requires_grocery: false,
    requires_bus: false,
    programs: 0,
    top_up_amount: 0,
    airtime: false,
    airtime_network: '',
    airtime_number: '',
    cover_amount: 0,
    cashback_amount: 0,
    amount_to_bank: 0,
    intake_day: '',
    service_type: 'book',
    total_price: '',
    casket_type: '',
    casket_colour: '',
    office_personnel1: '',
    client_name1: '',
    date1: '',
    office_personnel2: '',
    client_name2: '',
    date2: ''
  });

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [printMode, setPrintMode] = useState('');
  const [printedData, setPrintedData] = useState(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [serverDrafts, setServerDrafts] = useState([]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const idCandidate = (form.deceased_id || '').trim();
      const policyCandidate = (form.policy_number || '').trim();
      const nameCandidate = (form.deceased_name || '').trim();
      const contactCandidate = (form.nok_contact || '').trim();
      const hasNameContact = nameCandidate && contactCandidate;
      const hasId = idCandidate && /^\d{13}$/.test(idCandidate);
      const hasPolicy = !!policyCandidate;
      if (!hasId && !hasPolicy && !hasNameContact) return;
      try {
        const found = await lookupCase({
          deceased_id: hasId ? idCandidate : undefined,
          policy_number: hasPolicy ? policyCandidate : undefined,
          deceased_name: hasNameContact ? nameCandidate : undefined,
          nok_contact: hasNameContact ? contactCandidate : undefined
        });
        if (found) {
          setForm(prev => ({
            ...prev,
            policy_number: prev.policy_number || found.policy_number || '',
            deceased_name: prev.deceased_name || found.deceased_name || '',
            deceased_id: prev.deceased_id || found.deceased_id || '',
            nok_name: prev.nok_name || found.nok_name || '',
            nok_contact: prev.nok_contact || found.nok_contact || '',
            nok_relation: prev.nok_relation || found.nok_relation || '',
            plan_category: found.plan_category || prev.plan_category,
            plan_name: found.plan_name || prev.plan_name,
            plan_members: found.plan_members != null ? found.plan_members : prev.plan_members,
            plan_age_bracket: found.plan_age_bracket || prev.plan_age_bracket,
            venue_name: found.venue_name || prev.venue_name,
            venue_address: found.venue_address || prev.venue_address,
            service_date: found.service_date || found.funeral_date || prev.service_date,
            service_time: found.service_time || found.funeral_time || prev.service_time
          }));
          setMessage('Existing case data auto-filled');
        }
      } catch (e) {}
    }, 400);
    return () => clearTimeout(timeout);
  }, [form.deceased_id, form.policy_number, form.deceased_name, form.nok_contact]);

  useEffect(() => {
    const isSpecialPlan = form.plan_category === 'specials';
    const benefits = isSpecialPlan
      ? (SPECIAL_PLAN_BENEFITS[form.plan_name] || {})
      : (PLAN_BENEFITS[form.plan_name] || {});
    const nextBenefitMode = isSpecialPlan ? 'benefits' : form.benefit_mode;
    const nextCashbackAmount = isSpecialPlan ? 0 : (form.benefit_mode === 'cashback' ? (benefits.cover || 0) : 0);
    const hasAirtimeBenefit = (typeof benefits.airtime !== 'undefined') && nextBenefitMode === 'benefits';
    setForm(prev => ({
      ...prev,
      casket_type: benefits.casket || '',
      casket_colour: isSpecialPlan ? (prev.casket_colour || 'Cherry') : prev.casket_colour,
      cover_amount: benefits.cover || 0,
      cashback_amount: nextCashbackAmount,
      benefit_mode: nextBenefitMode,
      programs: benefits.programmes || prev.programs,
      airtime: hasAirtimeBenefit ? true : false,
      // You can auto-set more fields if needed, e.g., requires_flower: !!benefits.flower
    }));
  }, [form.plan_name, form.plan_category, form.benefit_mode]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!draftsOpen) return;
      try {
        const drafts = await listDraftsServer('claims');
        if (mounted) setServerDrafts(drafts);
      } catch (e) {
        if (mounted) setServerDrafts([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, [draftsOpen]);

  const getAutoPrice = () => {
    if (form.plan_category === 'colour_grade') return 0;
    const plan = PLAN_DATA[form.plan_category]?.[form.plan_name];
    const key = form.plan_category === 'motjha' || form.plan_category === 'specials'
      ? form.plan_members
      : form.plan_age_bracket;
    return plan?.[key] || 0;
  };

  const displayedPrice = form.service_type === 'book' ? getAutoPrice() : form.total_price || '';

  const isSpecialPlan = form.plan_category === 'specials';

  const getAutoCasketType = () => {
    if (isSpecialPlan) {
      return SPECIAL_PLAN_BENEFITS[form.plan_name]?.casket || '';
    }
    return form.casket_type || PLAN_BENEFITS[form.plan_name]?.casket || '';
  };

  const getExtrasSummary = () => {
    const items = [];
    if (form.requires_cow) items.push('Cow');
    if (form.requires_sheep) items.push('Sheep');
    if (form.requires_tombstone) items.push('Tombstone');
    if (form.requires_flower) items.push('Flower');
    if (form.requires_catering) items.push('Catering');
    if (form.requires_grocery) items.push('Grocery');
    if (form.requires_bus) items.push('Bus');
    if (form.programs) items.push(`Programmes: ${form.programs}`);
    if (form.top_up_amount) items.push(`Top-Up: R${form.top_up_amount}`);
    if (form.airtime) items.push(`Airtime: ${form.airtime_network || ''} ${form.airtime_number || ''}`.trim());
    return items.length ? items.join(', ') : 'None selected';
  };

  const getScheduleSummary = () => {
    const parts = [];
    if (form.cleansing_date || form.cleansing_time) parts.push(`Cleansing: ${form.cleansing_date || '-'} ${form.cleansing_time || ''}`.trim());
    if (form.delivery_date || form.delivery_time) parts.push(`Delivery: ${form.delivery_date || '-'} ${form.delivery_time || ''}`.trim());
    if (form.service_date || form.service_time) parts.push(`Service: ${form.service_date || '-'} ${form.service_time || ''}`.trim());
    if (form.church_date || form.church_time) parts.push(`Church: ${form.church_date || '-'} ${form.church_time || ''}`.trim());
    return parts.length ? parts.join(' • ') : 'No schedule set';
  };

  const COLOR_GRADES = ['Green', 'Silver', 'Gold', 'Platinum', 'Black', 'Pearl', 'Ivory'];
  const isColorGrade = (name) => COLOR_GRADES.includes(name);
  const getPlanIncludesText = () => {
    const b = PLAN_BENEFITS[form.plan_name] || {};
    if (form.plan_name === 'Green') {
      const groceries = (b.grocery_items || []).join(', ');
      return `${b.juice_liters || 0}L Juice • ${b.cakes_liters || 0}L Cakes • Grocery (${groceries})`;
    }
    const parts = [];
    if (b.casket) parts.push(`Casket: ${b.casket}`);
    if (b.tombstone) parts.push(`Tombstone: ${b.tombstone}`);
    if (typeof b.tent !== 'undefined') parts.push(`${b.tent} Tent`);
    if (typeof b.table !== 'undefined') parts.push(`${b.table} Table`);
    if (b.toilet) parts.push(`${String(b.toilet).toUpperCase()} Toilet`);
    if (typeof b.chairs !== 'undefined') parts.push(`${b.chairs} Chairs`);
    if (typeof b.programmes !== 'undefined') parts.push(`${b.programmes} Programmes`);
    if (typeof b.crucifix !== 'undefined') parts.push('Crucifix');
    if (typeof b.flower !== 'undefined') parts.push(`${b.flower} Flowers`);
    if (typeof b.airtime !== 'undefined') parts.push(`R${b.airtime} Airtime`);
    if (Array.isArray(b.grocery_items)) parts.push(`Grocery (${b.grocery_items.join(', ')})`);
    else if (b.grocery) parts.push(b.grocery);
    else if (b.groceries) parts.push(b.groceries);
    if (b.cow) parts.push('Cow');
    if (b.sheep) parts.push('Sheep');
    if (b.service) parts.push(b.service);
    if (isColorGrade(form.plan_name) && form.plan_name !== 'Green') parts.push('Free Repatriation');
    if (form.plan_name === 'Pearl' && form.benefit_mode === 'benefits') {
      if (form.pearl_bonus === 'cow') parts.push('Bonus: Cow');
      if (form.pearl_bonus === 'tombstone') parts.push('Bonus: Tombstone');
    }
    return parts.join(' • ');
  };

  const formatCategory = (cat) => {
    switch (cat) {
      case 'motjha': return 'MOTJHA';
      case 'family': return 'FAMILY';
      case 'single': return 'SINGLE';
      case 'specials': return 'SPRING SPECIALS';
      default: return String(cat || '').toUpperCase();
    }
  };
  const formatPlanTitle = (data) => `${formatCategory(data.plan_category)} - ${String(data.plan_name || '').toUpperCase()}`;

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getDraftKeys = () => {
    try {
      return Object.keys(window.localStorage).filter(k => k.startsWith('tfs_claim_draft_'));
    } catch (e) {
      return [];
    }
  };

  const getDrafts = () => {
    const keys = getDraftKeys();
    const arr = [];
    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') arr.push({ key, data });
      } catch (e) {}
    }
    return arr.sort((a, b) => String(b.data?.saved_at || '').localeCompare(String(a.data?.saved_at || '')));
  };

  const loadDraftKey = (key) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setMessage('Draft not found');
        return;
      }
      const data = JSON.parse(raw);
      setForm(prev => ({ ...prev, ...data }));
      setMessage('Draft loaded');
      setDraftsOpen(false);
      setDraftQuery('');
    } catch (e) {
      setMessage('Failed to load draft');
    }
  };

  const loadDraftByPolicy = async () => {
    const policy = String(draftQuery || '').trim()
    if (!policy) {
      setMessage('Enter policy number to load draft');
      return;
    }
    try {
      const serverDraft = await getDraftServer(policy);
      if (serverDraft && serverDraft.data) {
        setForm(prev => ({ ...prev, ...serverDraft.data }));
        setMessage('Draft loaded from server');
        setDraftsOpen(false);
        setDraftQuery('');
        return;
      }
    } catch (e) {}
    const key = `tfs_claim_draft_${policy}`;
    loadDraftKey(key);
  };

  const loadLastDraft = async () => {
    try {
      const srv = await getLastDraftServer();
      if (srv && srv.data) {
        setForm(prev => ({ ...prev, ...srv.data }));
        setMessage('Last draft loaded from server');
        setDraftsOpen(false);
        setDraftQuery('');
        return;
      }
      const key = window.localStorage.getItem('tfs_claim_draft_last');
      if (!key) {
        setMessage('No last draft found');
        return;
      }
      loadDraftKey(key);
    } catch (e) {
      setMessage('Failed to load last draft');
    }
  };

  const deleteDraftKey = async (key) => {
    try {
      const policy = String(key || '').replace('tfs_claim_draft_', '');
      if (policy) {
        try { await deleteDraftServer(policy); } catch (_) {}
      }
      window.localStorage.removeItem(key);
      setMessage('Draft deleted');
    } catch (e) {
      setMessage('Failed to delete draft');
    }
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

  const formatDateForBoxes = (dateStr) => {
    if (!dateStr) return Array(8).fill(' ');
    const [y, m, d] = dateStr.split('-');
    return [d[0] || ' ', d[1] || ' ', m[0] || ' ', m[1] || ' ', y[0] || ' ', y[1] || ' ', y[2] || ' ', y[3] || ' '];
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    // Validate minimum required to save a draft
    if (!form.claim_date || !form.policy_number || !form.deceased_name || !form.nok_name || !form.nok_contact) {
      setMessage('Please fill required claim details: Claim Date, Policy Number, Deceased Name, Claimant Name, Contact Details.');
      setSubmitting(false);
      return;
    }

    // Require service type and pricing to be resolved
    const autoPrice = getAutoPrice();
    if (!form.service_type) {
      setMessage('Please select Service Type (Book or Private)');
      setSubmitting(false);
      return;
    }
    if (form.service_type === 'book' && (!autoPrice || autoPrice <= 0)) {
      setMessage('Selected plan must have a valid price');
      setSubmitting(false);
      return;
    }
    if (form.service_type === 'private' && (!form.total_price || parseFloat(form.total_price) <= 0)) {
      setMessage('Please provide a manual Total Price for Private service');
      setSubmitting(false);
      return;
    }

    // Require cleansing details
    if (!form.cleansing_date || !form.cleansing_time) {
      setMessage('Please fill Cleansing (Ho Hlapisa) date and time');
      setSubmitting(false);
      return;
    }

    const data = {
      ...form,
      total_price: form.service_type === 'book' ? getAutoPrice() : parseFloat(form.total_price) || 0,
      casket_type: getAutoCasketType(),
      venue_lat: null,
      venue_lng: null,
      status: 'claim_draft',
      legacy_plan_name: getLegacyPlanName() || null
    };

    try {
      try {
        await saveDraftServer({ policy_number: data.policy_number, data, department: 'claims' });
        setMessage('Claim draft saved to server');
      } catch (err) {
        const serverErr = err.response?.data;
        const detail = serverErr?.details || serverErr?.hint || serverErr?.error;
        setMessage(`Remote save failed: ${detail || err.message}`);
      }
      
      const key = `tfs_claim_draft_${data.policy_number}`;
      const stamped = { ...data, saved_at: new Date().toISOString() };
      window.localStorage.setItem(key, JSON.stringify(stamped));
      window.localStorage.setItem('tfs_claim_draft_last', key);
      setMessage('Claim draft saved');
      setPrintedData(data);
      setPrintMode('receipt');
      setTimeout(() => window.print(), 500);
    } catch (err) {
      const serverErr = err.response?.data;
      const detail = serverErr?.details || serverErr?.hint || serverErr?.error;
      setMessage(`Failed to save draft: ${detail || err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    const data = {
      ...form,
      total_price: form.service_type === 'book' ? getAutoPrice() : parseFloat(form.total_price) || 0,
      casket_type: getAutoCasketType(),
      venue_lat: null,
      venue_lng: null,
      status: 'confirmed',
      legacy_plan_name: getLegacyPlanName() || null
    };

    try {
      if (!form.intake_day) {
        setMessage('Intake day is required and must be a Wednesday');
        setSubmitting(false);
        return;
      }
      const intakeDate = new Date(form.intake_day);
      if (isNaN(intakeDate.getTime()) || intakeDate.getDay() !== 3) {
        setMessage('Intake day must be a Wednesday');
        setSubmitting(false);
        return;
      }
      if (!form.delivery_date || !form.delivery_time || !form.service_date || !form.service_time) {
        setMessage('Delivery and service date/time are required');
        setSubmitting(false);
        return;
      }
      await createCase(data);
      setMessage('Case confirmed successfully! Printing full checklist...');
      setPrintedData(data);
      setPrintMode('full');
      setTimeout(() => window.print(), 500);
      // Reset form after confirmation
      setForm(prev => ({
        ...prev,
        deceased_name: '', deceased_id: '', nok_name: '', nok_contact: '', nok_relation: '',
        claim_date: '', policy_number: '',
        cleansing_date: '', cleansing_time: '', delivery_date: '', delivery_time: '',
        service_date: '', service_time: '', church_date: '', church_time: '',
        venue_name: '', venue_address: '', intake_day: '',
        requires_cow: false, requires_sheep: false, requires_tombstone: false, requires_flower: false,
        requires_catering: false, requires_grocery: false, requires_bus: false,
        programs: 0, top_up_amount: 0, airtime: false, airtime_network: '', airtime_number: '',
        cover_amount: 0, cashback_amount: 0, amount_to_bank: 0,
        total_price: '', casket_type: '', casket_colour: '',
        office_personnel1: '', client_name1: '', date1: '',
        office_personnel2: '', client_name2: '', date2: ''
      }));
    } catch (err) {
      const serverErr = err.response?.data;
      const detail = serverErr?.details || serverErr?.hint || serverErr?.error;
      setMessage(`Failed to confirm: ${detail || err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderBenefitsList = (data) => {
    const isSpecial = data.plan_category === 'specials';
    const benefits = isSpecial
      ? (SPECIAL_PLAN_BENEFITS[data.plan_name] || {})
      : (PLAN_BENEFITS[data.plan_name] || {});
    const isMotjhaGreen = data.plan_category === 'motjha' && data.plan_name === 'Green';
    if (isSpecial) {
      return (
        <div className="space-y-2">
          <div className="font-semibold">{formatPlanTitle(data)} Package</div>
          <ul className="list-disc pl-5">
            {benefits.casket && <li>Casket: {benefits.casket}</li>}
            {Array.isArray(benefits.benefits) && benefits.benefits.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
            {(() => {
              const extras = ['Flower','Grocery','Catering','Tombstone','Bus','Cow','Sheep','Airtime'];
              const map = {
                Flower: data.requires_flower,
                Grocery: data.requires_grocery,
                Catering: data.requires_catering,
                Tombstone: data.requires_tombstone,
                Bus: data.requires_bus,
                Cow: data.requires_cow,
                Sheep: data.requires_sheep,
                Airtime: data.airtime,
              };
              const selected = extras.filter(n => map[n]);
              const hasIncludedGrocery = (Array.isArray(benefits.grocery_items) && benefits.grocery_items.length > 0)
                || !!benefits.grocery
                || !!benefits.groceries
                || (Array.isArray(benefits.benefits) && benefits.benefits.some(b => String(b).toLowerCase().includes('grocery')));
              const notSelected = extras
                .filter(n => !map[n])
                .filter(n => !(n === 'Grocery' && hasIncludedGrocery));
              return (
                <>
                  <li>Additional Selected: {selected.length ? selected.join(', ') : 'None'}</li>
                  <li>Not Selected: {notSelected.length ? notSelected.join(', ') : 'None'}</li>
                  <li>Airtime Details: {data.airtime ? `${data.airtime_network || ''} ${data.airtime_number || ''}`.trim() || 'Provided' : 'None'}</li>
                  <li>Top-Up Amount: {data.top_up_amount || 'None'}</li>
                  <li>Amount to Bank: R{(data.amount_to_bank || 0).toLocaleString()}</li>
                </>
              );
            })()}
          </ul>
        </div>
      );
    }
    if (data.benefit_mode === 'cashback') {
      return (
        <div className="space-y-2">
          <div className="font-semibold">Plan Package: {formatPlanTitle(data)}</div>
          <ul className="list-disc pl-5">
            <li>Cashback: R{(data.cover_amount || 0).toLocaleString()}</li>
          </ul>
        </div>
      );
    }
    if (isMotjhaGreen) {
      return (
        <div className="space-y-2">
          <div className="font-semibold">{formatPlanTitle(data)} Package</div>
          <ul className="list-disc pl-5">
            <li>Included: {benefits.juice_liters || 0}L Juice, {benefits.cakes_liters || 0}L Cakes</li>
            <li>Grocery Items: {(benefits.grocery_items || []).join(', ')}</li>
            <li>Cover Amount: R{data.cover_amount.toLocaleString()}</li>
            {data.benefit_mode === 'cashback' && (
              <li>Cashback: R{(data.cover_amount || 0).toLocaleString()}</li>
            )}
            {(() => {
              const extras = ['Flower','Grocery','Catering','Tombstone','Bus','Cow','Sheep','Airtime'];
              const map = {
                Flower: data.requires_flower,
                Grocery: data.requires_grocery,
                Catering: data.requires_catering,
                Tombstone: data.requires_tombstone,
                Bus: data.requires_bus,
                Cow: data.requires_cow,
                Sheep: data.requires_sheep,
                Airtime: data.airtime,
              };
              const selected = extras.filter(n => map[n]);
              const hasIncludedGrocery = (Array.isArray(benefits.grocery_items) && benefits.grocery_items.length > 0)
                || !!benefits.grocery
                || !!benefits.groceries
                || (Array.isArray(benefits.benefits) && benefits.benefits.some(b => String(b).toLowerCase().includes('grocery')));
              const notSelected = extras
                .filter(n => !map[n])
                .filter(n => !(n === 'Grocery' && hasIncludedGrocery));
              return (
                <>
                  <li>Additional Selected: {selected.length ? selected.join(', ') : 'None'}</li>
                  <li>Not Selected: {notSelected.length ? notSelected.join(', ') : 'None'}</li>
                  <li>Programmes: {data.programs || 'None'}</li>
                  <li>Airtime Details: {data.airtime ? `${data.airtime_network || ''} ${data.airtime_number || ''}`.trim() || 'Provided' : 'None'}</li>
                  <li>Top-Up Amount: {data.top_up_amount || 'None'}</li>
                  <li>Amount to Bank: R{(data.amount_to_bank || 0).toLocaleString()}</li>
                </>
              );
            })()}
          </ul>
        </div>
      );
    }
    if (isColorGrade(data.plan_name)) {
      return (
        <div className="space-y-2">
          <div className="font-semibold">{formatPlanTitle(data)} Package</div>
          <ul className="list-disc pl-5">
            {benefits.casket && <li>Casket: {benefits.casket}</li>}
            {benefits.tombstone && <li>Tombstone: {benefits.tombstone}</li>}
            {typeof benefits.tent !== 'undefined' && <li>{benefits.tent} Tent</li>}
            {typeof benefits.table !== 'undefined' && <li>{benefits.table} Table</li>}
            {benefits.toilet && <li>{String(benefits.toilet).toUpperCase()} Toilet</li>}
            {typeof benefits.chairs !== 'undefined' && <li>{benefits.chairs} Chairs</li>}
            {typeof benefits.programmes !== 'undefined' && <li>{benefits.programmes} Programmes</li>}
            {typeof benefits.crucifix !== 'undefined' && <li>Crucifix</li>}
            {typeof benefits.flower !== 'undefined' && <li>{benefits.flower} Flowers</li>}
            {typeof benefits.airtime !== 'undefined' && <li>R{benefits.airtime} Airtime</li>}
            {Array.isArray(benefits.grocery_items) && benefits.grocery_items.length > 0 && (
              <li>Grocery Items: {benefits.grocery_items.join(', ')}</li>
            )}
            {benefits.grocery && <li>{benefits.grocery}</li>}
            {benefits.groceries && <li>{benefits.groceries}</li>}
            {benefits.service && <li>{benefits.service}</li>}
            {data.plan_name !== 'Green' && <li>Free Repatriation</li>}
            {data.plan_name === 'Pearl' && data.benefit_mode === 'benefits' && data.pearl_bonus && (
              <li>Bonus: {data.pearl_bonus === 'cow' ? 'Cow' : 'Tombstone'}</li>
            )}
            {data.benefit_mode === 'cashback' && (
              <li>Cashback: R{(data.cover_amount || 0).toLocaleString()}</li>
            )}
            {(() => {
              const extras = ['Flower','Grocery','Catering','Tombstone','Bus','Cow','Sheep','Airtime'];
              const map = {
                Flower: data.requires_flower,
                Grocery: data.requires_grocery,
                Catering: data.requires_catering,
                Tombstone: data.requires_tombstone,
                Bus: data.requires_bus,
                Cow: data.requires_cow,
                Sheep: data.requires_sheep,
                Airtime: data.airtime,
              };
              const selected = extras.filter(n => map[n]);
              const hasIncludedGrocery = (Array.isArray(benefits.grocery_items) && benefits.grocery_items.length > 0)
                || !!benefits.grocery
                || !!benefits.groceries
                || (Array.isArray(benefits.benefits) && benefits.benefits.some(b => String(b).toLowerCase().includes('grocery')));
              const notSelected = extras
                .filter(n => !map[n])
                .filter(n => !(n === 'Grocery' && hasIncludedGrocery));
              return (
                <>
                  <li>Additional Selected: {selected.length ? selected.join(', ') : 'None'}</li>
                  <li>Not Selected: {notSelected.length ? notSelected.join(', ') : 'None'}</li>
                  <li>Programmes: {data.programs || 'None'}</li>
                  <li>Airtime Details: {data.airtime ? `${data.airtime_network || ''} ${data.airtime_number || ''}`.trim() || 'Provided' : 'None'}</li>
                  <li>Top-Up Amount: {data.top_up_amount || 'None'}</li>
                  <li>Amount to Bank: R{(data.amount_to_bank || 0).toLocaleString()}</li>
                </>
              );
            })()}
          </ul>
        </div>
      );
    }
    return (
      <ul className="list-disc pl-5">
        {benefits.casket && <li>Casket: {benefits.casket}</li>}
        {benefits.tombstone && <li>Tombstone: {benefits.tombstone}</li>}
        {typeof benefits.tent !== 'undefined' && <li>{benefits.tent} Tent</li>}
        {typeof benefits.table !== 'undefined' && <li>{benefits.table} Table</li>}
        {benefits.toilet && <li>{String(benefits.toilet).toUpperCase()} Toilet</li>}
        {typeof benefits.chairs !== 'undefined' && <li>{benefits.chairs} Chairs</li>}
        {typeof benefits.programmes !== 'undefined' && <li>{benefits.programmes} Programmes</li>}
        {typeof benefits.crucifix !== 'undefined' && <li>Crucifix</li>}
        {typeof benefits.flower !== 'undefined' && <li>{benefits.flower} Flowers</li>}
        {typeof benefits.airtime !== 'undefined' && <li>R{benefits.airtime} Airtime</li>}
        {Array.isArray(benefits.grocery_items) && benefits.grocery_items.length > 0 && (
          <li>Grocery Items: {benefits.grocery_items.join(', ')}</li>
        )}
        {benefits.grocery && <li>{benefits.grocery}</li>}
        {benefits.groceries && <li>{benefits.groceries}</li>}
        {benefits.service && <li>{benefits.service}</li>}
        <li>Cover Amount: R{data.cover_amount.toLocaleString()}</li>
        <li>Cashback: R{(data.cashback_amount || 0).toLocaleString()}</li>
        <li>Programmes Selected: {data.programs}</li>
        {(() => {
          const extras = ['Flower','Grocery','Catering','Tombstone','Bus','Cow','Sheep','Airtime'];
          const map = {
            Flower: data.requires_flower,
            Grocery: data.requires_grocery,
            Catering: data.requires_catering,
            Tombstone: data.requires_tombstone,
            Bus: data.requires_bus,
            Cow: data.requires_cow,
            Sheep: data.requires_sheep,
            Airtime: data.airtime,
          };
          const selected = extras.filter(n => map[n]);
          const hasIncludedGrocery = (Array.isArray(benefits.grocery_items) && benefits.grocery_items.length > 0)
            || !!benefits.grocery
            || !!benefits.groceries
            || (Array.isArray(benefits.benefits) && benefits.benefits.some(b => String(b).toLowerCase().includes('grocery')));
          const notSelected = extras
            .filter(n => !map[n])
            .filter(n => !(n === 'Grocery' && hasIncludedGrocery));
          return (
            <>
              <li>Additional Selected: {selected.length ? selected.join(', ') : 'None'}</li>
              <li>Not Selected: {notSelected.length ? notSelected.join(', ') : 'None'}</li>
              <li>Airtime Details: {data.airtime ? `${data.airtime_network || ''} ${data.airtime_number || ''}`.trim() || 'Provided' : 'None'}</li>
              <li>Top-Up Amount: {data.top_up_amount || 'None'}</li>
              <li>Amount to Bank: R{(data.amount_to_bank || 0).toLocaleString()}</li>
            </>
          );
        })()}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 print:hidden">
        <div className="text-center mb-8">
          <p className="text-yellow-600 text-xl font-semibold mb-6">Live from QwaQwa • Re tšotella sechaba sa rona</p>
          <h2 className="text-3xl font-bold text-red-700">Family Consultation & Claim Form</h2>
          <p className="text-gray-600 mt-2">Complete the form below to process a claim or consultation</p>
        </div>

        <form className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* CLAIM & DECEASED INFO */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">1</span>
              Claim & Deceased Information
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <input
                  placeholder="Policy Number"
                  value={draftQuery}
                  onChange={e => setDraftQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border-2 border-yellow-300 rounded-lg"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={loadDraftByPolicy} className="px-4 py-2 rounded-lg bg-yellow-600 text-white font-semibold">Load Draft</button>
                  <button type="button" onClick={loadLastDraft} className="px-4 py-2 rounded-lg border font-semibold">Load Last</button>
                  <button type="button" onClick={() => setDraftsOpen(v => !v)} className="px-4 py-2 rounded-lg border font-semibold">{draftsOpen ? 'Hide List' : 'View Saved Drafts'}</button>
                </div>
              </div>
              {draftsOpen && (
                <div className="mt-4 max-h-56 overflow-auto bg-white border border-yellow-200 rounded-lg">
                  {serverDrafts && serverDrafts.length > 0 && (
                    serverDrafts.map((d) => (
                      <div key={`srv_${d.policy_number}`} className="flex items-center justify-between p-3 border-b">
                        <div className="text-sm">
                          <span className="font-bold">{d.policy_number}</span>
                          <span className="ml-2 text-gray-500">{d.updated_at ? new Date(d.updated_at).toLocaleString() : ''}</span>
                          {d.department && <span className="ml-2 text-gray-400">{d.department}</span>}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={async () => {
                            try {
                              const serverDraft = await getDraftServer(d.policy_number);
                              if (serverDraft && serverDraft.data) {
                                setForm(prev => ({ ...prev, ...serverDraft.data }));
                                setMessage('Draft loaded from server');
                                setDraftsOpen(false);
                                setDraftQuery('');
                              }
                            } catch (e) {}
                          }} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Load</button>
                          <button type="button" onClick={async () => {
                            const reason = window.prompt('Enter reason for deletion');
                            if (reason == null) return;
                            try { await deleteDraftServer(d.policy_number, reason); } catch (_) {}
                            setServerDrafts(prev => prev.filter(x => x.policy_number !== d.policy_number));
                          }} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                  {getDrafts().length > 0 && (
                    getDrafts().map(({ key, data }) => (
                      <div key={key} className="flex items-center justify-between p-3 border-b last:border-b-0">
                        <div className="text-sm">
                          <span className="font-bold">{data.policy_number}</span>
                          <span className="ml-2">{data.deceased_name || ''}</span>
                          <span className="ml-2 text-gray-500">{data.saved_at ? new Date(data.saved_at).toLocaleString() : ''}</span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => loadDraftKey(key)} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Load</button>
                          <button type="button" onClick={() => deleteDraftKey(key)} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                  {(!serverDrafts || serverDrafts.length === 0) && getDrafts().length === 0 && (
                    <div className="p-4 text-sm text-gray-600">No drafts found</div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label>Claim Date <span className="text-red-600">*</span></label><input type="date" required value={form.claim_date} onChange={e => handleInputChange('claim_date', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Policy Number <span className="text-red-600">*</span></label><input required value={form.policy_number} onChange={e => handleInputChange('policy_number', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Enter policy number" /></div>
              <div><label>Deceased Full Name <span className="text-red-600">*</span></label><input required value={form.deceased_name} onChange={e => handleInputChange('deceased_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Enter deceased name" /></div>
              <div><label>ID Number</label><input value={form.deceased_id} onChange={e => handleInputChange('deceased_id', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Claimant Name <span className="text-red-600">*</span></label><input required value={form.nok_name} onChange={e => handleInputChange('nok_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Contact Details <span className="text-red-600">*</span></label><input required value={form.nok_contact} onChange={e => handleInputChange('nok_contact', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Relationship</label><input value={form.nok_relation} onChange={e => handleInputChange('nok_relation', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="e.g., Spouse, Child" /></div>
            </div>
          </div>

          {/* PLAN SELECTION */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>
              Plan Selection & Pricing
            </h3>

            {/* Service Type (at top) */}
            <div className="bg-gray-50 p-6 rounded-xl mb-8">
              <label className="block font-semibold mb-4">Service Type:</label>
              <div className="flex gap-8 mb-6">
                <label className="flex items-center"><input type="radio" name="service_type" value="book" checked={form.service_type === 'book'} onChange={e => handleInputChange('service_type', e.target.value)} className="mr-3" /><span className="font-medium">Book (Plan Price)</span></label>
                <label className="flex items-center"><input type="radio" name="service_type" value="private" checked={form.service_type === 'private'} onChange={e => handleInputChange('service_type', e.target.value)} className="mr-3" /><span className="font-medium">Private (Manual Price)</span></label>
              </div>
            </div>

            {/* Quick Legacy Plan Selector */}
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
              <label className="block text-sm font-bold text-amber-900 mb-3">
                📋 Quick Select: Brochure Plan Name (Optional)
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleLegacyPlanSelect(e.target.value);
                    e.target.value = '';
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
                  const defaultName = cat === 'specials' ? 'Spring A' :
                    cat === 'motjha' ? 'Budget Buster' :
                      cat === 'single' ? 'Budget Buster' :
                        'Budget Buster';
                  const defaultsForMembers = (cat === 'motjha' || cat === 'specials') ? 6 : form.plan_members;
                  const defaultsForAge = (cat === 'family' || cat === 'single') ? '18-65' : '';
                  setForm(prev => ({
                    ...prev,
                    plan_category: cat,
                    plan_name: defaultName,
                    plan_members: defaultsForMembers,
                    plan_age_bracket: defaultsForAge
                  }));
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
                    <p className="text-xs text-blue-700">{getPlanIncludesText()}</p>
                  </div>
                )}
              </div>
            )}

            {/* Special Benefits */}
            {isSpecialPlan && SPECIAL_PLAN_BENEFITS[form.plan_name] && (
              (() => {
                const special = SPECIAL_PLAN_BENEFITS[form.plan_name];
                return (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                    <h4 className="font-bold text-green-800 text-lg mb-3">{form.plan_name} Benefits:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      {special.casket && <li>• {special.casket}</li>}
                      {Array.isArray(special.benefits) && special.benefits.map((b, i) => <li key={i}>• {b}</li>)}
                    </ul>
                  </div>
                );
              })()
            )}

            {/* Cover Option: Cashback vs Benefits */}
            <div className="bg-gray-50 p-6 rounded-xl mb-6">
              <label className="block font-semibold mb-4">Cover Option:</label>
              <div className="flex gap-8 mb-3">
                {!isSpecialPlan && (
                  <label className="flex items-center"><input type="radio" name="benefit_mode" value="cashback" checked={form.benefit_mode === 'cashback'} onChange={e => handleInputChange('benefit_mode', e.target.value)} className="mr-3" /><span className="font-medium">Cashback (R{(PLAN_BENEFITS[form.plan_name]?.cover || form.cover_amount).toLocaleString()})</span></label>
                )}
                <label className="flex items-center"><input type="radio" name="benefit_mode" value="benefits" checked={form.benefit_mode === 'benefits'} onChange={e => handleInputChange('benefit_mode', e.target.value)} className="mr-3" /><span className="font-medium">Benefits per plan</span></label>
              </div>
              {form.plan_category === 'motjha' && form.plan_name === 'Green' && form.benefit_mode === 'benefits' && (
                <p className="text-sm text-gray-700">Includes: {PLAN_BENEFITS.Green.juice_liters}L Juice, {PLAN_BENEFITS.Green.cakes_liters}L Cakes, Grocery ({PLAN_BENEFITS.Green.grocery_items.join(', ')})</p>
              )}
              {isColorGrade(form.plan_name) && form.plan_name !== 'Green' && form.benefit_mode === 'benefits' && (
                <p className="text-sm text-gray-700">Includes: {getPlanIncludesText()}</p>
              )}
              {form.plan_name === 'Pearl' && form.benefit_mode === 'benefits' && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold mb-2">Pearl Bonus (choose one):</label>
                  <div className="flex gap-6">
                    <label className="flex items-center"><input type="radio" name="pearl_bonus" value="cow" checked={form.pearl_bonus === 'cow'} onChange={e => handleInputChange('pearl_bonus', e.target.value)} className="mr-2" />Cow</label>
                    <label className="flex items-center"><input type="radio" name="pearl_bonus" value="tombstone" checked={form.pearl_bonus === 'tombstone'} onChange={e => handleInputChange('pearl_bonus', e.target.value)} className="mr-2" />Tombstone</label>
                  </div>
                </div>
              )}
            </div>

            {/* Total Price (end of Plan Selection & Pricing) */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex justify-between items-center bg-white p-5 rounded-lg border-2 border-gray-300">
                <span className="text-xl font-bold">Total Price:</span>
                {form.service_type === 'book' ? (
                  <span className="text-3xl font-bold text-green-600">R{displayedPrice}</span>
                ) : (
                  <input type="number" placeholder="0.00" value={form.total_price} onChange={e => handleInputChange('total_price', e.target.value)} className="w-40 px-4 py-3 border-2 rounded-lg text-right text-2xl font-bold" />
                )}
              </div>
              {form.airtime && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const b = PLAN_BENEFITS[form.plan_name] || {};
                        const amount = typeof b.airtime !== 'undefined' ? parseFloat(b.airtime) : 0;
                        if (!form.airtime_network || !form.airtime_number) {
                          setMessage('Provide Network and Number for airtime request');
                          return;
                        }
                        const req = await createAirtimeRequest({
                          case_id: null,
                          policy_number: form.policy_number || '',
                          beneficiary_name: form.nok_name || '',
                          network: form.airtime_network,
                          phone_number: form.airtime_number,
                          amount,
                          notes: `Auto from plan ${form.plan_name}`
                        });
                        setMessage(`Airtime request created (Status: ${req.status})`);
                      } catch (e) {
                        setMessage('Failed to create airtime request');
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                  >
                    Send Airtime Request
                  </button>
                  <span className="text-sm text-gray-600">Operator will be notified</span>
                </div>
              )}
            </div>

          </div>

          {/* SCHEDULE DETAILS */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <h3 className="text-xl font-bold text-red-800 flex items-center">
                <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>
                Schedule Details (Cleansing, Delivery, Service, Church)
              </h3>
              <button type="button" onClick={() => setScheduleOpen(v => !v)} className="ml-auto px-4 py-2 rounded-lg border text-sm font-semibold hover:bg-gray-100">
                {scheduleOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            {!scheduleOpen && (
              <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                {getScheduleSummary()}
              </div>
            )}
            {scheduleOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Cleansing Date</label>
                    <input type="date" value={form.cleansing_date} onChange={e => handleInputChange('cleansing_date', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Cleansing Time</label>
                    <input type="time" value={form.cleansing_time} onChange={e => handleInputChange('cleansing_time', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Delivery Date</label>
                    <input type="date" value={form.delivery_date} onChange={e => handleInputChange('delivery_date', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Delivery Time</label>
                    <input type="time" value={form.delivery_time} onChange={e => handleInputChange('delivery_time', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Service Date</label>
                    <input type="date" value={form.service_date} onChange={e => handleInputChange('service_date', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Service Time</label>
                    <input type="time" value={form.service_time} onChange={e => handleInputChange('service_time', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Church Date</label>
                    <input type="date" value={form.church_date} onChange={e => handleInputChange('church_date', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Church Time</label>
                    <input type="time" value={form.church_time} onChange={e => handleInputChange('church_time', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CASKET & VENUE */}
          <div className="p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">4</span>
              Casket & Venue Details
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
              <div>
                <label>Casket Colour</label>
                <select value={form.casket_colour} onChange={e => handleInputChange('casket_colour', e.target.value)} className="w-full px-4 py-3 border rounded-lg">
                  <option value="">Select colour</option>
                  <option value="Cherry">Cherry</option>
                  <option value="Kiaat">Kiaat</option>
                  <option value="Redwood">Redwood</option>
                  <option value="Ash">Ash</option>
                  <option value="White">White</option>
                  <option value="Black">Black</option>
                  <option value="Brown">Brown</option>
                  <option value="MIDBROWN">MIDBROWN</option>
                </select>
              </div>
              <div><label>Service Venue</label><input value={form.venue_name} onChange={e => handleInputChange('venue_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Full Address (GPS) <span className="text-red-600">*</span></label><input required value={form.venue_address} onChange={e => handleInputChange('venue_address', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
            </div>
          </div>

          <div className="p-8 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <h3 className="text-xl font-bold text-red-800 flex items-center">
                <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">5</span>
                Additional Services & Benefits
              </h3>
              <button type="button" onClick={() => setExtrasOpen(v => !v)} className="ml-auto px-4 py-2 rounded-lg border text-sm font-semibold hover:bg-gray-100">
                {extrasOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            {!extrasOpen && (
              <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                {getExtrasSummary()}
              </div>
            )}
            {extrasOpen && (
              <div className="space-y-4">
                <label className="flex items-center"><input type="checkbox" checked={form.requires_cow} onChange={e => handleInputChange('requires_cow', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Cow</span></label>
                <label className="flex items-center"><input type="checkbox" checked={form.requires_sheep} onChange={e => handleInputChange('requires_sheep', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Sheep</span></label>
                <label className="flex items-center"><input type="checkbox" checked={form.requires_tombstone} onChange={e => handleInputChange('requires_tombstone', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Tombstone</span></label>
                <label className="flex items-center"><input type="checkbox" checked={form.requires_flower} onChange={e => handleInputChange('requires_flower', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Flower</span></label>
                <label className="flex items-center"><input type="checkbox" checked={form.requires_catering} onChange={e => handleInputChange('requires_catering', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Catering</span></label>
                <label className="flex items-center"><input type="checkbox" checked={form.requires_grocery} onChange={e => handleInputChange('requires_grocery', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Grocery</span></label>
                <label className="flex items-center"><input type="checkbox" checked={form.requires_bus} onChange={e => handleInputChange('requires_bus', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Bus</span></label>
                <div><label>Programmes (Number)</label><input type="number" value={form.programs} onChange={e => handleInputChange('programs', parseInt(e.target.value) || 0)} className="w-full px-4 py-3 border rounded-lg mt-2" /></div>
                <div><label>Top-Up Amount R</label><input type="number" value={form.top_up_amount} onChange={e => handleInputChange('top_up_amount', parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 border rounded-lg mt-2" /></div>
                <label className="flex items-center"><input type="checkbox" checked={form.airtime} onChange={e => handleInputChange('airtime', e.target.checked)} className="mr-3 w-5 h-5" /><span className="font-medium">Airtime</span></label>
                {form.airtime && (
                  <div className="grid grid-cols-2 gap-4 ml-8">
                    <div><label>Network</label><input value={form.airtime_network} onChange={e => handleInputChange('airtime_network', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
                    <div><label>Number</label><input value={form.airtime_number} onChange={e => handleInputChange('airtime_number', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
                  </div>
                )}
                <div><label>Cashback Amount (Auto)</label><input disabled value={form.cashback_amount} className="w-full px-4 py-3 border rounded-lg bg-gray-100 mt-2" /></div>
                <div><label>Amount to Bank</label><input type="number" value={form.amount_to_bank} onChange={e => handleInputChange('amount_to_bank', parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 border rounded-lg mt-2" /></div>
                <div><label>Cover Amount (Auto)</label><input disabled value={form.cover_amount} className="w-full px-4 py-3 border rounded-lg bg-gray-100 mt-2" /></div>
                <div><label>Intake Day (Wednesday)</label><input type="date" value={form.intake_day} onChange={e => handleInputChange('intake_day', e.target.value)} className="w-full px-4 py-3 border rounded-lg mt-2" /></div>
              </div>
            )}
          </div>

          {/* SIGN OFF */}
          <div className="p-8">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
              <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3">6</span>
              Sign Off
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div><label>Office Personnel (Check List)</label><input value={form.office_personnel1} onChange={e => handleInputChange('office_personnel1', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Client Name (Check List)</label><input value={form.client_name1} onChange={e => handleInputChange('client_name1', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Date (Check List)</label><input type="date" value={form.date1} onChange={e => handleInputChange('date1', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label>Office Personnel (Sign Off)</label><input value={form.office_personnel2} onChange={e => handleInputChange('office_personnel2', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Client Name (Sign Off)</label><input value={form.client_name2} onChange={e => handleInputChange('client_name2', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
              <div><label>Date (Sign Off)</label><input type="date" value={form.date2} onChange={e => handleInputChange('date2', e.target.value)} className="w-full px-4 py-3 border rounded-lg" /></div>
            </div>
          </div>

          

          {/* SUBMIT BUTTONS */}
          <div className="p-8 bg-gray-50 border-t flex gap-4">
            <button type="button" onClick={handleSaveDraft} disabled={submitting} className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-bold py-5 rounded-xl text-xl transition">
              {submitting ? "Saving..." : "Save Claim Draft & Print Receipt"}
            </button>
            <button type="submit" onClick={handleFinalSubmit} disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-5 rounded-xl text-xl transition">
              {submitting ? "Submitting..." : "Confirm & Print Full Checklist"}
            </button>
          </div>
          {message && (
            <div className={`p-4 rounded-lg text-center font-bold ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Toll Free: <span className="font-bold text-red-600">0800 01 4574</span> | Serving with Dignity</p>
        </div>
      </div>

      {/* Printable Section */}
      {printedData && printMode && (
        <>
          <style>{`@media print { body, html { margin:0; } @page { size: A4; margin: 10mm; } body * { visibility: hidden !important; } #tfs-print-root, #tfs-print-root * { visibility: visible !important; } #tfs-print-root { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
          <div id="tfs-print-root" className="hidden print:block" style={{ margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: '10pt', padding: '0' }}>
          <div className="flex justify-between mb-4">
            <h1 className="text-2xl font-bold text-red-800">THUSANANG FUNERAL SERVICES</h1>
            <p className="text-right">RESPECTFUL | PROFESSIONAL | DIGNIFIED<br />Head Office Phuthaditjhaba<br />Site 1, Portion 2, Beirut<br />Tel: 08000 145 74 | After Hours: 073 750 0857<br />Cell No / WhatsApp: 071 480 5050 / 073 073 1580<br />info@thusanangfs.co.za<br />www.thusanangfs.co.za<br />AN AUTHORISED SERVICE PROVIDER | FSP: 39701</p>
          </div>

          {printMode === 'receipt' ? (
            <>
              <h2 className="text-xl font-bold text-center bg-red-600 text-white py-2 mb-4">CLAIM RECEIPT</h2>
              <p><strong>Policy Number:</strong> {printedData.policy_number}</p>
              <p><strong>Deceased Names:</strong> {printedData.deceased_name}</p>
              <p><strong>Claimant Names:</strong> {printedData.nok_name}</p>
              <p><strong>Contact Details:</strong> {printedData.nok_contact}</p>
              <p><strong>Cleansing:</strong> {printedData.cleansing_date} {printedData.cleansing_time && (`• ${printedData.cleansing_time}`)}</p>
              {printedData.cover_amount > 0 && (
                <p><strong>Cover Amount:</strong> R{printedData.cover_amount.toLocaleString()}</p>
              )}
              <h3 className="font-bold mt-4">Plan Benefits:</h3>
              {renderBenefitsList(printedData)}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr><td className="border p-2 font-semibold bg-gray-50">CLAIM DATE</td><td className="border p-2">{formatDateForBoxes(printedData.claim_date).map((char, i) => <span key={i} className="inline-block w-6 text-center border border-black mx-1">{char}</span>)}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">POLICY NUMBER</td><td className="border p-2">{printedData.policy_number}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">DECEASED NAMES</td><td className="border p-2">{printedData.deceased_name}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">CLAIMANT NAMES</td><td className="border p-2">{printedData.nok_name}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">CONTACT DETAILS</td><td className="border p-2">{printedData.nok_contact}</td></tr>
                  </tbody>
                </table>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr><td className="border p-2 font-semibold bg-gray-50">CLEANSING</td><td className="border p-2">DATE: {printedData.cleansing_date} TIME: {printedData.cleansing_time}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">DELIVERY</td><td className="border p-2">DATE: {printedData.delivery_date} TIME: {printedData.delivery_time}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">SERVICE</td><td className="border p-2">DATE: {printedData.service_date} TIME: {printedData.service_time}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">CHURCH</td><td className="border p-2">DATE: {printedData.church_date} TIME: {printedData.church_time}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">SERVICE VENUE</td><td className="border p-2">{printedData.venue_name}</td></tr>
                  </tbody>
                </table>
              </div>

              <h2 className="text-center bg-red-600 text-white py-2 mb-2">CHECK LIST</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr><td className="border p-2 font-semibold bg-gray-50">COVER AMOUNT</td><td className="border p-2">R{printedData.cover_amount.toLocaleString()}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">CASKET/COFFIN TYPE</td><td className="border p-2">{printedData.casket_type}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">CASKET/COFFIN COLOUR</td><td className="border p-2">{printedData.casket_colour}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">COW</td><td className="border p-2">{printedData.requires_cow ? 'Yes' : 'None'}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">SHEEP</td><td className="border p-2">{printedData.requires_sheep ? 'Yes' : 'None'}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">TOMBSTONE</td><td className="border p-2">{printedData.requires_tombstone ? 'Yes' : 'None'}</td></tr>
                  </tbody>
                </table>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr><td className="border p-2 font-semibold bg-gray-50">FLOWER</td><td className="border p-2">{printedData.requires_flower ? 'Yes' : 'None'}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">BUS</td><td className="border p-2">{printedData.requires_bus ? 'Yes' : 'None'}</td></tr>
                    {printedData.plan_category !== 'specials' && (
                      <tr><td className="border p-2 font-semibold bg-gray-50">PROGRAMMES</td><td className="border p-2">{printedData.programs || 'None'}</td></tr>
                    )}
                    <tr><td className="border p-2 font-semibold bg-gray-50">CATERING</td><td className="border p-2">{printedData.requires_catering ? 'Yes' : 'None'}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">GROCERY</td><td className="border p-2">{(() => { const isSpecial = printedData.plan_category === 'specials'; const benefits = isSpecial ? (SPECIAL_PLAN_BENEFITS[printedData.plan_name] || {}) : (PLAN_BENEFITS[printedData.plan_name] || {}); if (Array.isArray(benefits.grocery_items) && benefits.grocery_items.length > 0) { return benefits.grocery_items.join(', '); } if (benefits.grocery) { return String(benefits.grocery); } if (benefits.groceries) { return String(benefits.groceries); } return printedData.requires_grocery ? 'Selected (items not specified)' : 'None'; })()}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">TOP-UP AMOUNT R</td><td className="border p-2">{printedData.top_up_amount || 'None'}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">AIRTIME</td><td className="border p-2">{printedData.airtime ? 'Yes' : 'None'}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">NETWORK</td><td className="border p-2">{printedData.airtime ? (printedData.airtime_network || 'Provided') : 'None'}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">NUMBER</td><td className="border p-2">{printedData.airtime ? (printedData.airtime_number || 'Provided') : 'None'}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">CASHBACK AMOUNT</td><td className="border p-2">R{printedData.cashback_amount.toLocaleString()}</td></tr>
                    <tr><td className="border p-2 font-semibold bg-gray-50">AMOUNT TO BANK</td><td className="border p-2">R{printedData.amount_to_bank.toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>

              <table className="w-full border-collapse mb-4">
                <tbody>
                  <tr><td className="border p-2">OFFICE PERSONNEL</td><td className="border p-2">{printedData.office_personnel1}</td><td className="border p-2">CLIENT NAME</td><td className="border p-2">{printedData.client_name1}</td></tr>
                  <tr><td className="border p-2">DATE</td><td className="border p-2">{printedData.date1}</td><td className="border p-2">DATE</td><td className="border p-2">{printedData.date1}</td></tr>
                </tbody>
              </table>

              <h2 className="text-center bg-red-600 text-white py-2 mb-2">SIGN OFF</h2>
              <table className="w-full border-collapse">
                <tbody>
                  <tr><td className="border p-2">OFFICE PERSONNEL</td><td className="border p-2">{printedData.office_personnel2}</td><td className="border p-2">CLIENT NAME</td><td className="border p-2">{printedData.client_name2}</td></tr>
                  <tr><td className="border p-2">DATE</td><td className="border p-2">{printedData.date2}</td><td className="border p-2">DATE</td><td className="border p-2">{printedData.date2}</td></tr>
                </tbody>
              </table>
            </>
          )}

          <p className="text-center mt-4 text-lg font-bold">RESPECTFUL | PROFESSIONAL | DIGNIFIED</p>
          </div>
        </>
      )}
    </div>
  );
}
