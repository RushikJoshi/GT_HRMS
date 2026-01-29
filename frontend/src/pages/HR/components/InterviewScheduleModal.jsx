import React, { useState } from 'react';
import { Modal, DatePicker, TimePicker, Input } from 'antd';
import { Calendar } from 'lucide-react';
import dayjs from 'dayjs';

/**
 * InterviewScheduleModal Component
 * Schedule interview for candidate and move to next round
 */
const InterviewScheduleModal = ({
  visible,
  applicant,
  onSchedule,
  onCancel,
  loading = false
}) => {
  const [interviewDate, setInterviewDate] = useState(null);
  const [interviewTime, setInterviewTime] = useState(null);
  const [location, setLocation] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [notes, setNotes] = useState('');

  const handleSchedule = () => {
    if (!interviewDate || !interviewTime || !location) {
      alert('Please fill in date, time, and location');
      return;
    }

    const interviewDetails = {
      date: interviewDate.format('YYYY-MM-DD'),
      time: interviewTime.format('HH:mm'),
      location,
      interviewerName,
      notes,
      status: 'Scheduled'
    };

    onSchedule(applicant, interviewDetails);
    
    // Reset form
    setInterviewDate(null);
    setInterviewTime(null);
    setLocation('');
    setInterviewerName('');
    setNotes('');
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-black">
          <Calendar size={20} className="text-blue-600" />
          <span>Schedule Interview for {applicant?.name}</span>
        </div>
      }
      open={visible}
      onOk={handleSchedule}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Schedule Interview"
      okButtonProps={{ className: 'bg-blue-600' }}
      width={500}
    >
      <div className="space-y-4 py-4">
        {/* Interview Date */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">
            Interview Date *
          </label>
          <DatePicker
            value={interviewDate}
            onChange={setInterviewDate}
            format="DD-MM-YYYY"
            className="w-full"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </div>

        {/* Interview Time */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">
            Interview Time *
          </label>
          <TimePicker
            value={interviewTime}
            onChange={setInterviewTime}
            format="HH:mm"
            className="w-full"
          />
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">
            Location/Meeting Link *
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Zoom Link or Office Address"
            className="rounded-lg"
          />
        </div>

        {/* Interviewer Name */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">
            Interviewer Name
          </label>
          <Input
            value={interviewerName}
            onChange={(e) => setInterviewerName(e.target.value)}
            placeholder="Your name"
            className="rounded-lg"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Info Message */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            ℹ️ Once scheduled, the candidate will automatically move to the Interview round.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default InterviewScheduleModal;
