import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  appointmentDate: { type: Date, required: true },
  reason: { type: String },
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending"
  },
  notes: String,
}, { timestamps: true });

export default mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);
