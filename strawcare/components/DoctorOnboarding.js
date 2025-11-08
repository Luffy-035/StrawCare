"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createDoctorProfile } from "@/actions/doctorActions";
import { Stethoscope, User, GraduationCap, Clock } from "lucide-react";

const CATEGORIES = [
  "Cardiology",
  "Dermatology", 
  "Pediatrics",
  "Orthopedics",
  "Neurology",
  "Gynecology",
  "ENT",
  "Psychiatry",
  "General Medicine",
  "Surgery"
];

const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00"
];

export default function DoctorOnboarding() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    specialization: "",
    category: "",
    experience: "",
    qualifications: "",
    consultationFee: "",
    availability: DAYS.map(day => ({ day, slots: [], selected: false }))
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayToggle = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.map((avail, index) => 
        index === dayIndex 
          ? { ...avail, selected: !avail.selected, slots: !avail.selected ? [] : avail.slots }
          : avail
      )
    }));
  };

  const handleSlotToggle = (dayIndex, slot) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.map((avail, index) => 
        index === dayIndex 
          ? {
              ...avail,
              slots: avail.slots.includes(slot)
                ? avail.slots.filter(s => s !== slot)
                : [...avail.slots, slot].sort()
            }
          : avail
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const qualificationsArray = formData.qualifications
        .split(',')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      const availabilityData = formData.availability
        .filter(avail => avail.selected && avail.slots.length > 0)
        .map(avail => ({
          day: avail.day,
          slots: avail.slots
        }));

      const doctorData = {
        name: formData.name,
        phone: formData.phone,
        specialization: formData.specialization,
        category: formData.category,
        experience: parseInt(formData.experience),
        qualifications: qualificationsArray,
        consultationFee: parseFloat(formData.consultationFee),
        availability: availabilityData
      };

      await createDoctorProfile(doctorData);
    } catch (error) {
      console.error("Error creating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-700">
            <Stethoscope className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Complete Your Profile</h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Help patients find you by completing your medical profile information
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Personal Information */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-white">
                <User className="h-6 w-6 text-emerald-400" />
                <span className="text-xl">Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-zinc-300 text-base">Full Name *</Label>
                  <Input
                    id="name"
                    className="bg-zinc-900 border-zinc-700 text-white focus:border-emerald-400 h-12 text-base"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-zinc-300 text-base">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className="bg-zinc-900 border-zinc-700 text-white focus:border-emerald-400 h-12 text-base"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-white">
                <GraduationCap className="h-6 w-6 text-emerald-400" />
                <span className="text-xl">Professional Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="specialization" className="text-zinc-300 text-base">Specialization *</Label>
                  <Input
                    id="specialization"
                    className="bg-zinc-900 border-zinc-700 text-white focus:border-emerald-400 h-12 text-base"
                    value={formData.specialization}
                    onChange={(e) => handleInputChange('specialization', e.target.value)}
                    placeholder="e.g. Internal Medicine"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-zinc-300 text-base">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-12 text-base">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category.toLowerCase()} className="hover:bg-zinc-800 text-base">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="experience" className="text-zinc-300 text-base">Years of Experience *</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    className="bg-zinc-900 border-zinc-700 text-white focus:border-emerald-400 h-12 text-base"
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="consultationFee" className="text-zinc-300 text-base">Consultation Fee (₹) *</Label>
                  <Input
                    id="consultationFee"
                    type="number"
                    min="0"
                    step="0.01"
                    className="bg-zinc-900 border-zinc-700 text-white focus:border-emerald-400 h-12 text-base"
                    value={formData.consultationFee}
                    onChange={(e) => handleInputChange('consultationFee', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="qualifications" className="text-zinc-300 text-base">Qualifications *</Label>
                <Textarea
                  id="qualifications"
                  className="bg-zinc-900 border-zinc-700 text-white focus:border-emerald-400 min-h-[120px] text-base"
                  value={formData.qualifications}
                  onChange={(e) => handleInputChange('qualifications', e.target.value)}
                  placeholder="Enter qualifications separated by commas (e.g. MBBS, MD Internal Medicine, Fellowship in Cardiology)"
                  required
                />
                <p className="text-sm text-zinc-500 mt-2">Separate multiple qualifications with commas</p>
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-white">
                <Clock className="h-6 w-6 text-emerald-400" />
                <span className="text-xl">Availability</span>
              </CardTitle>
              <CardDescription className="text-zinc-400 text-base pt-1">
                Select the days and time slots when you're available for consultations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-2">
              {formData.availability.map((dayAvail, dayIndex) => (
                <div key={dayAvail.day} className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={dayAvail.day}
                      checked={dayAvail.selected}
                      onCheckedChange={() => handleDayToggle(dayIndex)}
                      className="w-5 h-5 border-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <Label htmlFor={dayAvail.day} className="text-lg font-medium text-white">
                      {dayAvail.day}
                    </Label>
                  </div>
                  
                  {dayAvail.selected && (
                    <div className="ml-8 space-y-4">
                      <p className="text-base text-zinc-400">Select available time slots:</p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                        {TIME_SLOTS.map((slot) => (
                          <Button
                            key={slot}
                            type="button"
                            variant={dayAvail.slots.includes(slot) ? "default" : "outline"}
                            size="sm"
                            className={`text-sm px-3 py-2 ${dayAvail.slots.includes(slot) ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white'}`}
                            onClick={() => handleSlotToggle(dayIndex, slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                      {dayAvail.slots.length > 0 && (
                        <p className="text-base text-emerald-400">
                          Selected: {dayAvail.slots.length} slots
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardContent className="py-8">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg"
                disabled={loading}
              >
                {loading ? "Creating Profile..." : "Submit for Review"}
              </Button>
              <p className="text-base text-zinc-500 text-center mt-6">
                Your profile will be reviewed by our team and you'll be notified once approved.
              </p>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
