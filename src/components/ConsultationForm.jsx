// src/components/ConsultationForm.jsx
import React, { useState, useEffect } from 'react';

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

export default function ConsultationForm({ onSubmit }) {
  const [form, setForm] = useState({
    category: 'motjha',
    plan: 'Green',
    members: 6,
    age: '18-65',
    deceased_name: '',
    deceased_id: '',
    nok_name: '',
    nok_contact: '',
    funeral_date: '',
    funeral_time: '',
    venue_name: '',
    venue_address: '',
    requires_cow: false
  });

  const getPrice = () => {
    if (form.category === 'colour_grade') return 0;
    const plan = PLAN_DATA[form.category][form.plan];
    const key = form.category === 'motjha' ? form.members : form.age;
    return plan?.[key] || 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const grade = COLOUR_GRADE[form.plan];
    onSubmit({
      ...form,
      total_price: getPrice(),
      stock_needed: {
        coffin: grade.casket,
        tent: grade.tent,
        chairs: grade.chairs,
        grocery_value: grade.grocery
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Wednesday Family Consultation</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="Deceased Name" required className="input" 
          onChange={e => setForm({...form, deceased_name: e.target.value})} />
        <input placeholder="ID Number" className="input" 
          onChange={e => setForm({...form, deceased_id: e.target.value})} />
        <input placeholder="Next of Kin" required className="input" 
          onChange={e => setForm({...form, nok_name: e.target.value})} />
        <input placeholder="Contact" required className="input" 
          onChange={e => setForm({...form, nok_contact: e.target.value})} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <select className="input" onChange={e => setForm({...form, category: e.target.value, plan: 'Green'})}>
          <option value="motjha">Motjha O Tlhele</option>
          <option value="single">Single</option>
          <option value="family">Family</option>
          <option value="colour_grade">Colour Grade</option>
        </select>

        <select className="input" onChange={e => setForm({...form, plan: e.target.value})}>
          {Object.keys(form.category === 'colour_grade' ? COLOUR_GRADE : PLAN_DATA[form.category]).map(p => 
            <option key={p} value={p}>{p}</option>
          )}
        </select>

        {form.category !== 'colour_grade' && (
          <select className="input" onChange={e => setForm({...form, [form.category === 'motjha' ? 'members' : 'age']: e.target.value})}>
            {form.category === 'motjha' 
              ? [6,10,14].map(n => <option key={n} value={n}>{n} Members</option>)
              : ['18-65','66-85','86-100'].map(a => <option key={a} value={a}>{a}</option>)
            }
          </select>
        )}
      </div>

      <div className="mt-4 text-right font-bold">Total: R{getPrice()}</div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <input type="date" required className="input" onChange={e => setForm({...form, funeral_date: e.target.value})} />
        <input type="time" required className="input" onChange={e => setForm({...form, funeral_time: e.target.value})} />
        <input placeholder="Venue Name" className="input" onChange={e => setForm({...form, venue_name: e.target.value})} />
        <input placeholder="Full Address (GPS)" required className="input" onChange={e => setForm({...form, venue_address: e.target.value})} />
      </div>

      <div className="mt-4">
        <label><input type="checkbox" onChange={e => setForm({...form, requires_cow: e.target.checked})} /> Requires Cow (Kgomo)</label>
      </div>

      <button type="submit" className="mt-6 w-full bg-green-600 text-white py-3 rounded hover:bg-green-700">
        Reserve Stock & Add to Planner
      </button>
    </form>
  );
}
