import React, { useState, useEffect } from 'react';
import { notification } from 'antd';
import api from '../../utils/api';
import {
    Save,
    Clock,
    Calendar,
    ToggleLeft,
    ToggleRight,
    ShieldCheck,
    MapPin,
    Globe,
    Lock,
    Plus,
    X,
    Settings2,
    Clock3,
    LogOut,
    UserCheck,
    Home,
    Briefcase,
    Gift,
    Cpu
} from 'lucide-react';

export default function AttendanceSettings() {
    const [settings, setSettings] = useState({
        shiftStartTime: "09:00",
        shiftEndTime: "18:00",
        graceTimeMinutes: 15,
        lateMarkThresholdMinutes: 30,
        halfDayThresholdHours: 4,
        fullDayThresholdHours: 7,
        weeklyOffDays: [0],
        sandwichLeave: false,
        autoAbsent: true,
        attendanceLockDay: 25,
        // Punch Policy
        punchMode: 'single',
        maxPunchesPerDay: 10,
        maxPunchAction: 'block',
        breakTrackingEnabled: false,
        overtimeAllowed: false,
        overtimeAfterShiftHours: true,
        overtimeToPayroll: false,
        geoFencingEnabled: false,
        officeLatitude: null,
        officeLongitude: null,
        allowedRadiusMeters: 100,
        ipRestrictionEnabled: false,
        allowedIPs: [],
        allowedIPRanges: [],
        locationRestrictionMode: 'none',
        geofance: [],
        // Advanced Policy – keep structure in sync with backend schema
        advancedPolicy: {
            weeklyOff: {
                mode: 'basic',
                saturdayHalfDayEnabled: false,
                alternateSaturday: {
                    workingWeeks: [1, 3],
                    offWeeks: [2, 4]
                },
                employeeOverrides: []
            },
            lateMarkRules: {
                enabled: false,
                allowedLateMinutesPerDay: 0,
                lateMarksToHalfDay: 0,
                lateMarksToFullDay: 0,
                autoLeaveDeductionEnabled: false
            },
            earlyExitRules: {
                enabled: false,
                allowedEarlyMinutesPerDay: 0,
                earlyExitsToHalfDay: 0,
                earlyExitsToFullDay: 0
            },
            halfDayRules: {
                enabled: false,
                workingHoursThreshold: 0,
                lateMinutesThreshold: 0,
                saturdayHalfDayEnabled: false
            },
            absentRules: {
                noPunchConsideredAbsent: true,
                singlePunchBehaviour: 'half_day',
                autoLeaveDeductionEnabled: false,
                convertToLopWhenNoLeave: false
            },
            leaveIntegration: {
                autoLeaveDeductionOrder: ['CL', 'SL', 'EL', 'Optional', 'LOP'],
                sandwichRuleEnabled: false,
                wfhPresentMode: 'present'
            },
            wfhSettings: {
                enabled: false,
                gpsRestrictionEnabled: false,
                ipRestrictionEnabled: false,
                autoPresentMode: 'requires_approval'
            },
            odSettings: {
                enabled: false,
                approvalRequired: true,
                odCountMode: 'present'
            },
            compOffSettings: {
                enabled: false,
                autoCreditOnHolidayWork: false,
                expiryDays: 30,
                approvalRequired: true
            },
            deviceSettings: {
                allowedSources: [],
                faceRecognitionMandatory: false,
                webCheckinAllowed: true
            },
            manualCorrectionWorkflow: {
                enabled: true,
                requireManagerApproval: true,
                requireHrApproval: true
            },
            nightShiftRules: {
                enabled: false,
                shiftSpansMidnight: false,
                nightShiftAllowanceEnabled: false,
                nightShiftAllowanceCode: '',
                overtimeSeparateForNightShift: false
            }
        }
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/attendance/settings');
            if (res.data) setSettings(res.data);
        } catch (err) {
            console.error("Failed to load settings", err);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put('/attendance/settings', settings);
            notification.success({ message: 'Success', description: "Settings saved successfully!", placement: 'topRight' });
        } catch (err) {
            notification.error({ message: 'Error', description: "Failed to save settings", placement: 'topRight' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-500">
            {/* Shift Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 h-32 w-32 bg-slate-50 dark:bg-slate-800/50 rounded-bl-full -mr-16 -mt-16 opacity-20"></div>

                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <Clock className="text-blue-500" />
                    Shift & Grace Time
                </h3>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Shift Start" type="time" value={settings.shiftStartTime} onChange={(e) => setSettings({ ...settings, shiftStartTime: e.target.value })} />
                        <InputGroup label="Shift End" type="time" value={settings.shiftEndTime} onChange={(e) => setSettings({ ...settings, shiftEndTime: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Grace Minutes" type="number" value={settings.graceTimeMinutes} onChange={(e) => setSettings({ ...settings, graceTimeMinutes: parseInt(e.target.value) })} />
                        <InputGroup label="Late Threshold" type="number" value={settings.lateMarkThresholdMinutes} onChange={(e) => setSettings({ ...settings, lateMarkThresholdMinutes: parseInt(e.target.value) })} />
                    </div>
                </div>
            </div>

            {/* Threshold Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <ShieldCheck className="text-emerald-500" />
                    Presence Thresholds
                </h3>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="HD Threshold (Hrs)" type="number" value={settings.halfDayThresholdHours} onChange={(e) => setSettings({ ...settings, halfDayThresholdHours: parseInt(e.target.value) })} />
                        <InputGroup label="P Threshold (Hrs)" type="number" value={settings.fullDayThresholdHours} onChange={(e) => setSettings({ ...settings, fullDayThresholdHours: parseInt(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Monthly Lock Day" type="number" value={settings.attendanceLockDay} onChange={(e) => setSettings({ ...settings, attendanceLockDay: parseInt(e.target.value) })} />
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block px-1">Leave Cycle Start</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white"
                                value={settings.leaveCycleStartMonth || 0}
                                onChange={(e) => setSettings({ ...settings, leaveCycleStartMonth: parseInt(e.target.value) })}
                            >
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Punch Mode Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <Lock className="text-purple-500" />
                    Punch Mode Configuration
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Punch Mode</label>
                        <select
                            value={settings.punchMode}
                            onChange={(e) => setSettings({ ...settings, punchMode: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                        >
                            <option value="single">Single Punch Mode (1 IN, 1 OUT per day)</option>
                            <option value="multiple">Multiple Punch Mode (Multiple IN/OUT for breaks)</option>
                        </select>
                    </div>

                    {settings.punchMode === 'multiple' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup
                                    label="Max Punches Per Day"
                                    type="number"
                                    value={settings.maxPunchesPerDay}
                                    onChange={(e) => setSettings({ ...settings, maxPunchesPerDay: parseInt(e.target.value) })}
                                />
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Action on Limit</label>
                                    <select
                                        value={settings.maxPunchAction}
                                        onChange={(e) => setSettings({ ...settings, maxPunchAction: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                    >
                                        <option value="block">Block Further Punches</option>
                                        <option value="warn">Show Warning (Allow)</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <ToggleItem
                        label="Break Tracking"
                        description="Deduct break time from working hours calculation"
                        active={settings.breakTrackingEnabled}
                        onClick={() => setSettings({ ...settings, breakTrackingEnabled: !settings.breakTrackingEnabled })}
                    />
                </div>
            </div>

            {/* Overtime Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <Clock className="text-orange-500" />
                    Overtime Configuration
                </h3>

                <div className="space-y-6">
                    <ToggleItem
                        label="Overtime Allowed"
                        description="Enable overtime tracking and calculation"
                        active={settings.overtimeAllowed}
                        onClick={() => setSettings({ ...settings, overtimeAllowed: !settings.overtimeAllowed })}
                    />

                    {settings.overtimeAllowed && (
                        <>
                            <ToggleItem
                                label="Overtime After Shift Hours Only"
                                description="Only count overtime after scheduled shift hours"
                                active={settings.overtimeAfterShiftHours}
                                onClick={() => setSettings({ ...settings, overtimeAfterShiftHours: !settings.overtimeAfterShiftHours })}
                            />
                            <ToggleItem
                                label="Send Overtime to Payroll"
                                description="Export overtime hours to payroll system"
                                active={settings.overtimeToPayroll}
                                onClick={() => setSettings({ ...settings, overtimeToPayroll: !settings.overtimeToPayroll })}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Location Restrictions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <MapPin className="text-red-500" />
                    Location Restrictions
                </h3>

                <div className="space-y-6">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Location based restrictions (Geo / IP) are currently disabled for this tenant.
                        Use the advanced policy rules below to control attendance through working hours,
                        late marks, WFH and OD rules instead.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputGroup
                            label="Full Day Threshold (Hrs)"
                            type="number"
                            value={settings.fullDayThresholdHours}
                            onChange={(e) => setSettings({ ...settings, fullDayThresholdHours: parseFloat(e.target.value || '0') })}
                        />
                        <InputGroup
                            label="Half Day Threshold (Hrs)"
                            type="number"
                            value={settings.halfDayThresholdHours}
                            onChange={(e) => setSettings({ ...settings, halfDayThresholdHours: parseFloat(e.target.value || '0') })}
                        />
                        <InputGroup
                            label="Grace Minutes"
                            type="number"
                            value={settings.graceTimeMinutes}
                            onChange={(e) => setSettings({ ...settings, graceTimeMinutes: parseInt(e.target.value || '0', 10) })}
                        />
                    </div>
                </div>
            </div>

            {/* Policy Toggles */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
                <div className="flex flex-wrap gap-8">
                    <ToggleItem
                        label="Sandwich Leave Rules"
                        description="Apply leave to weekends between absences"
                        active={settings.sandwichLeave}
                        onClick={() => setSettings({ ...settings, sandwichLeave: !settings.sandwichLeave })}
                    />
                    <ToggleItem
                        label="Auto-Mark Absent"
                        description="Mark absent if no punch log exists"
                        active={settings.autoAbsent}
                        onClick={() => setSettings({ ...settings, autoAbsent: !settings.autoAbsent })}
                    />
                </div>
            </div>

            {/* === ADVANCED ATTENDANCE POLICY SECTIONS (COLLAPSIBLE) === */}

            {/* Weekly Off & Half-Day Logic */}
            <CollapsibleCard
                title="Weekly Off & Saturday Rules"
                icon={<Calendar className="text-indigo-500" />}
                description="Configure weekly off combinations, alternate Saturdays, and Saturday half-day behavior"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Weekly Off Mode
                            </label>
                            <select
                                value={settings.advancedPolicy?.weeklyOff?.mode || 'basic'}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        weeklyOff: {
                                            ...settings.advancedPolicy.weeklyOff,
                                            mode: e.target.value
                                        }
                                    }
                                })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition"
                            >
                                <option value="basic">Use Weekly Off Days Only</option>
                                <option value="sunday">Sunday Off</option>
                                <option value="saturday_sunday">Saturday + Sunday Off</option>
                                <option value="alternate_saturday">Alternate Saturday Off (1st &amp; 3rd Saturday Off)</option>
                                <option value="alternate_saturday">Alternate Saturday Off (2nd &amp; 4th Saturday Off)</option>
                                <option value="custom">Custom (Use Weekly Off + Overrides)</option>
                            </select>
                        </div>
                        <ToggleItem
                            label="Saturday Half Day"
                            description="Treat Saturdays as half-day working instead of weekly off"
                            active={!!settings.advancedPolicy?.weeklyOff?.saturdayHalfDayEnabled}
                            onClick={() => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    weeklyOff: {
                                        ...settings.advancedPolicy.weeklyOff,
                                        saturdayHalfDayEnabled: !settings.advancedPolicy.weeklyOff.saturdayHalfDayEnabled
                                    }
                                }
                            })}
                        />
                    </div>

                    {settings.advancedPolicy?.weeklyOff?.mode === 'alternate_saturday' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputGroup
                                label="Working Saturdays (Weeks)"
                                type="text"
                                value={(settings.advancedPolicy.weeklyOff.alternateSaturday.workingWeeks || []).join(',')}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const list = val.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
                                    setSettings({
                                        ...settings,
                                        advancedPolicy: {
                                            ...settings.advancedPolicy,
                                            weeklyOff: {
                                                ...settings.advancedPolicy.weeklyOff,
                                                alternateSaturday: {
                                                    ...settings.advancedPolicy.weeklyOff.alternateSaturday,
                                                    workingWeeks: list
                                                }
                                            }
                                        }
                                    });
                                }}
                            />
                            <InputGroup
                                label="Off Saturdays (Weeks)"
                                type="text"
                                value={(settings.advancedPolicy.weeklyOff.alternateSaturday.offWeeks || []).join(',')}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const list = val.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
                                    setSettings({
                                        ...settings,
                                        advancedPolicy: {
                                            ...settings.advancedPolicy,
                                            weeklyOff: {
                                                ...settings.advancedPolicy.weeklyOff,
                                                alternateSaturday: {
                                                    ...settings.advancedPolicy.weeklyOff.alternateSaturday,
                                                    offWeeks: list
                                                }
                                            }
                                        }
                                    });
                                }}
                            />
                        </div>
                    )}
                </div>
            </CollapsibleCard>

            {/* Late Mark Rules */}
            <CollapsibleCard
                title="Late Mark Rules"
                icon={<Clock3 className="text-amber-500" />}
                description="Define allowed late minutes and conversion of late marks into half-day or LOP"
            >
                <div className="space-y-6">
                    <ToggleItem
                        label="Enable Late Mark Rules"
                        description="Apply advanced late mark thresholds and auto leave deduction"
                        active={!!settings.advancedPolicy?.lateMarkRules?.enabled}
                        onClick={() => setSettings({
                            ...settings,
                            advancedPolicy: {
                                ...settings.advancedPolicy,
                                lateMarkRules: {
                                    ...settings.advancedPolicy.lateMarkRules,
                                    enabled: !settings.advancedPolicy.lateMarkRules.enabled
                                }
                            }
                        })}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputGroup
                            label="Allowed Late Minutes / Day"
                            type="number"
                            value={settings.advancedPolicy.lateMarkRules.allowedLateMinutesPerDay}
                            onChange={(e) => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    lateMarkRules: {
                                        ...settings.advancedPolicy.lateMarkRules,
                                        allowedLateMinutesPerDay: parseInt(e.target.value || '0', 10)
                                    }
                                }
                            })}
                        />
                        <InputGroup
                            label="Late Marks = Half Day"
                            type="number"
                            value={settings.advancedPolicy.lateMarkRules.lateMarksToHalfDay}
                            onChange={(e) => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    lateMarkRules: {
                                        ...settings.advancedPolicy.lateMarkRules,
                                        lateMarksToHalfDay: parseInt(e.target.value || '0', 10)
                                    }
                                }
                            })}
                        />
                        <InputGroup
                            label="Late Marks = 1 Day LOP"
                            type="number"
                            value={settings.advancedPolicy.lateMarkRules.lateMarksToFullDay}
                            onChange={(e) => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    lateMarkRules: {
                                        ...settings.advancedPolicy.lateMarkRules,
                                        lateMarksToFullDay: parseInt(e.target.value || '0', 10)
                                    }
                                }
                            })}
                        />
                    </div>
                    <ToggleItem
                        label="Auto Leave Deduction on Late"
                        description="Automatically deduct leave when late thresholds are breached"
                        active={!!settings.advancedPolicy.lateMarkRules.autoLeaveDeductionEnabled}
                        onClick={() => setSettings({
                            ...settings,
                            advancedPolicy: {
                                ...settings.advancedPolicy,
                                lateMarkRules: {
                                    ...settings.advancedPolicy.lateMarkRules,
                                    autoLeaveDeductionEnabled: !settings.advancedPolicy.lateMarkRules.autoLeaveDeductionEnabled
                                }
                            }
                        })}
                    />
                </div>
            </CollapsibleCard>

            {/* Early Exit Rules */}
            <CollapsibleCard
                title="Early Exit Rules"
                icon={<LogOut className="text-rose-500" />}
                description="Track early exits and configure when they contribute to half-day or LOP"
            >
                <div className="space-y-6">
                    <ToggleItem
                        label="Enable Early Exit Rules"
                        description="Apply early exit thresholds and conversions"
                        active={!!settings.advancedPolicy?.earlyExitRules?.enabled}
                        onClick={() => setSettings({
                            ...settings,
                            advancedPolicy: {
                                ...settings.advancedPolicy,
                                earlyExitRules: {
                                    ...settings.advancedPolicy.earlyExitRules,
                                    enabled: !settings.advancedPolicy.earlyExitRules.enabled
                                }
                            }
                        })}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputGroup
                            label="Allowed Early Minutes / Day"
                            type="number"
                            value={settings.advancedPolicy.earlyExitRules.allowedEarlyMinutesPerDay}
                            onChange={(e) => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    earlyExitRules: {
                                        ...settings.advancedPolicy.earlyExitRules,
                                        allowedEarlyMinutesPerDay: parseInt(e.target.value || '0', 10)
                                    }
                                }
                            })}
                        />
                        <InputGroup
                            label="Early Exits = Half Day"
                            type="number"
                            value={settings.advancedPolicy.earlyExitRules.earlyExitsToHalfDay}
                            onChange={(e) => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    earlyExitRules: {
                                        ...settings.advancedPolicy.earlyExitRules,
                                        earlyExitsToHalfDay: parseInt(e.target.value || '0', 10)
                                    }
                                }
                            })}
                        />
                        <InputGroup
                            label="Early Exits = 1 Day LOP"
                            type="number"
                            value={settings.advancedPolicy.earlyExitRules.earlyExitsToFullDay}
                            onChange={(e) => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    earlyExitRules: {
                                        ...settings.advancedPolicy.earlyExitRules,
                                        earlyExitsToFullDay: parseInt(e.target.value || '0', 10)
                                    }
                                }
                            })}
                        />
                    </div>
                </div>
            </CollapsibleCard>

            {/* Half-Day & Absent Rules */}
            <CollapsibleCard
                title="Half-Day & Absent Rules"
                icon={<UserCheck className="text-emerald-500" />}
                description="Control when a day is treated as half-day or absent based on work hours and punches"
            >
                <div className="space-y-6">
                    <ToggleItem
                        label="Enable Half-Day Rules"
                        description="Apply additional thresholds on top of basic presence rules"
                        active={!!settings.advancedPolicy?.halfDayRules?.enabled}
                        onClick={() => setSettings({
                            ...settings,
                            advancedPolicy: {
                                ...settings.advancedPolicy,
                                halfDayRules: {
                                    ...settings.advancedPolicy.halfDayRules,
                                    enabled: !settings.advancedPolicy.halfDayRules.enabled
                                }
                            }
                        })}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputGroup
                            label="Half-Day if Hours &lt;"
                            type="number"
                            value={settings.advancedPolicy.halfDayRules.workingHoursThreshold}
                            onChange={(e) => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    halfDayRules: {
                                        ...settings.advancedPolicy.halfDayRules,
                                        workingHoursThreshold: parseFloat(e.target.value || '0')
                                    }
                                }
                            })}
                        />
                        <InputGroup
                            label="Half-Day if Late &gt; (mins)"
                            type="number"
                            value={settings.advancedPolicy.halfDayRules.lateMinutesThreshold}
                            onChange={(e) => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    halfDayRules: {
                                        ...settings.advancedPolicy.halfDayRules,
                                        lateMinutesThreshold: parseInt(e.target.value || '0', 10)
                                    }
                                }
                            })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ToggleItem
                            label="No Punch = Absent"
                            description="Automatically mark absent if no punches are recorded"
                            active={!!settings.advancedPolicy.absentRules.noPunchConsideredAbsent}
                            onClick={() => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    absentRules: {
                                        ...settings.advancedPolicy.absentRules,
                                        noPunchConsideredAbsent: !settings.advancedPolicy.absentRules.noPunchConsideredAbsent
                                    }
                                }
                            })}
                        />
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Only IN / No OUT
                            </label>
                            <select
                                value={settings.advancedPolicy.absentRules.singlePunchBehaviour}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        absentRules: {
                                            ...settings.advancedPolicy.absentRules,
                                            singlePunchBehaviour: e.target.value
                                        }
                                    }
                                })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 transition"
                            >
                                <option value="half_day">Treat as Half-Day</option>
                                <option value="absent">Treat as Absent</option>
                            </select>
                        </div>
                        <ToggleItem
                            label="Convert to LOP if No Leave"
                            description="When auto leave deduction fails, convert deficit to Loss of Pay"
                            active={!!settings.advancedPolicy.absentRules.convertToLopWhenNoLeave}
                            onClick={() => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    absentRules: {
                                        ...settings.advancedPolicy.absentRules,
                                        convertToLopWhenNoLeave: !settings.advancedPolicy.absentRules.convertToLopWhenNoLeave
                                    }
                                }
                            })}
                        />
                    </div>
                </div>
            </CollapsibleCard>

            {/* Leave & Attendance Integration + WFH / OD / Comp-off */}
            <CollapsibleCard
                title="Leave, WFH, OD & Comp-Off Integration"
                icon={<Home className="text-sky-500" />}
                description="Control how leave, WFH, on-duty and comp-off interact with attendance"
            >
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Auto Leave Deduction Priority
                        </label>
                        <input
                            type="text"
                            value={(settings.advancedPolicy.leaveIntegration.autoLeaveDeductionOrder || []).join(',')}
                            onChange={(e) => {
                                const list = e.target.value
                                    .split(',')
                                    .map(v => v.trim())
                                    .filter(Boolean);
                                setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        leaveIntegration: {
                                            ...settings.advancedPolicy.leaveIntegration,
                                            autoLeaveDeductionOrder: list
                                        }
                                    }
                                });
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition"
                            placeholder="CL,SL,EL,Optional,LOP"
                        />
                        <ToggleItem
                            label="Holiday + Weekend Sandwich Rule"
                            description="Count weekends between two leaves as leave as per company policy"
                            active={!!settings.advancedPolicy.leaveIntegration.sandwichRuleEnabled}
                            onClick={() => setSettings({
                                ...settings,
                                advancedPolicy: {
                                    ...settings.advancedPolicy,
                                    leaveIntegration: {
                                        ...settings.advancedPolicy.leaveIntegration,
                                        sandwichRuleEnabled: !settings.advancedPolicy.leaveIntegration.sandwichRuleEnabled
                                    }
                                }
                            })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* WFH */}
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 space-y-4 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                                <Home size={16} className="text-sky-500" />
                                Work From Home
                            </div>
                            <ToggleItem
                                label="Enable WFH"
                                description="Allow employees to be marked present while working remotely"
                                active={!!settings.advancedPolicy.wfhSettings.enabled}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        wfhSettings: {
                                            ...settings.advancedPolicy.wfhSettings,
                                            enabled: !settings.advancedPolicy.wfhSettings.enabled
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="GPS Restriction"
                                description="Apply GPS validation when on WFH"
                                active={!!settings.advancedPolicy.wfhSettings.gpsRestrictionEnabled}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        wfhSettings: {
                                            ...settings.advancedPolicy.wfhSettings,
                                            gpsRestrictionEnabled: !settings.advancedPolicy.wfhSettings.gpsRestrictionEnabled
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="IP Restriction"
                                description="Restrict WFH to specific IPs/VPNs"
                                active={!!settings.advancedPolicy.wfhSettings.ipRestrictionEnabled}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        wfhSettings: {
                                            ...settings.advancedPolicy.wfhSettings,
                                            ipRestrictionEnabled: !settings.advancedPolicy.wfhSettings.ipRestrictionEnabled
                                        }
                                    }
                                })}
                            />
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    WFH Treated As
                                </label>
                                <select
                                    value={settings.advancedPolicy.leaveIntegration.wfhPresentMode}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        advancedPolicy: {
                                            ...settings.advancedPolicy,
                                            leaveIntegration: {
                                                ...settings.advancedPolicy.leaveIntegration,
                                                wfhPresentMode: e.target.value
                                            }
                                        }
                                    })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition"
                                >
                                    <option value="present">Present (Full Day)</option>
                                    <option value="half_day">Half Day</option>
                                </select>
                            </div>
                        </div>

                        {/* On Duty */}
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 space-y-4 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                                <Briefcase size={16} className="text-amber-500" />
                                On-Duty
                            </div>
                            <ToggleItem
                                label="Enable On-Duty"
                                description="Allow OD days to count as presence as per policy"
                                active={!!settings.advancedPolicy.odSettings.enabled}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        odSettings: {
                                            ...settings.advancedPolicy.odSettings,
                                            enabled: !settings.advancedPolicy.odSettings.enabled
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="Approval Required"
                                description="Require manager/HR approval for OD requests"
                                active={!!settings.advancedPolicy.odSettings.approvalRequired}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        odSettings: {
                                            ...settings.advancedPolicy.odSettings,
                                            approvalRequired: !settings.advancedPolicy.odSettings.approvalRequired
                                        }
                                    }
                                })}
                            />
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    OD Counted As
                                </label>
                                <select
                                    value={settings.advancedPolicy.odSettings.odCountMode}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        advancedPolicy: {
                                            ...settings.advancedPolicy,
                                            odSettings: {
                                                ...settings.advancedPolicy.odSettings,
                                                odCountMode: e.target.value
                                            }
                                        }
                                    })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-amber-500 transition"
                                >
                                    <option value="present">Present</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="custom">Custom (Reporting only)</option>
                                </select>
                            </div>
                        </div>

                        {/* Comp-Off */}
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 space-y-4 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                                <Gift size={16} className="text-emerald-500" />
                                Comp-Off
                            </div>
                            <ToggleItem
                                label="Enable Comp-Off"
                                description="Track compensatory off for working on holidays/week-offs"
                                active={!!settings.advancedPolicy.compOffSettings.enabled}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        compOffSettings: {
                                            ...settings.advancedPolicy.compOffSettings,
                                            enabled: !settings.advancedPolicy.compOffSettings.enabled
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="Auto Credit on Holiday Work"
                                description="Automatically credit comp-off when employees work on holidays/weekly-offs"
                                active={!!settings.advancedPolicy.compOffSettings.autoCreditOnHolidayWork}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        compOffSettings: {
                                            ...settings.advancedPolicy.compOffSettings,
                                            autoCreditOnHolidayWork: !settings.advancedPolicy.compOffSettings.autoCreditOnHolidayWork
                                        }
                                    }
                                })}
                            />
                            <InputGroup
                                label="Comp-Off Expiry (Days)"
                                type="number"
                                value={settings.advancedPolicy.compOffSettings.expiryDays}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        compOffSettings: {
                                            ...settings.advancedPolicy.compOffSettings,
                                            expiryDays: parseInt(e.target.value || '0', 10)
                                        }
                                    }
                                })}
                            />
                        </div>
                    </div>
                </div>
            </CollapsibleCard>

            {/* Device & Punch Source + Night Shift & Manual Correction */}
            <CollapsibleCard
                title="Device, Punch Source & Night Shift Rules"
                icon={<Cpu className="text-purple-500" />}
                description="Control which devices can punch and configure night-shift specific rules"
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Device & Source */}
                        <div className="space-y-4">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Allowed Punch Sources
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {['biometric', 'mobile', 'web'].map(source => {
                                    const active = (settings.advancedPolicy.deviceSettings.allowedSources || []).includes(source);
                                    return (
                                        <button
                                            key={source}
                                            type="button"
                                            onClick={() => {
                                                const current = settings.advancedPolicy.deviceSettings.allowedSources || [];
                                                const exists = current.includes(source);
                                                const next = exists ? current.filter(s => s !== source) : [...current, source];
                                                setSettings({
                                                    ...settings,
                                                    advancedPolicy: {
                                                        ...settings.advancedPolicy,
                                                        deviceSettings: {
                                                            ...settings.advancedPolicy.deviceSettings,
                                                            allowedSources: next
                                                        }
                                                    }
                                                });
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border transition ${
                                                active
                                                    ? 'bg-purple-600 text-white border-purple-600'
                                                    : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                                            }`}
                                        >
                                            {source === 'biometric' && 'Biometric'}
                                            {source === 'mobile' && 'Mobile App'}
                                            {source === 'web' && 'Web'}
                                        </button>
                                    );
                                })}
                            </div>

                            <ToggleItem
                                label="Face Recognition Mandatory"
                                description="Require face verification for allowed punch sources"
                                active={!!settings.advancedPolicy.deviceSettings.faceRecognitionMandatory}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        deviceSettings: {
                                            ...settings.advancedPolicy.deviceSettings,
                                            faceRecognitionMandatory: !settings.advancedPolicy.deviceSettings.faceRecognitionMandatory
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="Allow Web Check-In"
                                description="Permit browser-based check-in (subject to IP/geo restrictions)"
                                active={!!settings.advancedPolicy.deviceSettings.webCheckinAllowed}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        deviceSettings: {
                                            ...settings.advancedPolicy.deviceSettings,
                                            webCheckinAllowed: !settings.advancedPolicy.deviceSettings.webCheckinAllowed
                                        }
                                    }
                                })}
                            />
                        </div>

                        {/* Night Shift & Manual Correction */}
                        <div className="space-y-4">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Night Shift & Correction Workflow
                            </div>
                            <ToggleItem
                                label="Enable Night Shift Rules"
                                description="Treat shifts that span midnight with special rules"
                                active={!!settings.advancedPolicy.nightShiftRules.enabled}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        nightShiftRules: {
                                            ...settings.advancedPolicy.nightShiftRules,
                                            enabled: !settings.advancedPolicy.nightShiftRules.enabled
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="Shift Spans Midnight"
                                description="Mark default shift as spanning past midnight"
                                active={!!settings.advancedPolicy.nightShiftRules.shiftSpansMidnight}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        nightShiftRules: {
                                            ...settings.advancedPolicy.nightShiftRules,
                                            shiftSpansMidnight: !settings.advancedPolicy.nightShiftRules.shiftSpansMidnight
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="Night Shift Allowance"
                                description="Tag eligibility for night shift allowance (code driven in payroll)"
                                active={!!settings.advancedPolicy.nightShiftRules.nightShiftAllowanceEnabled}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        nightShiftRules: {
                                            ...settings.advancedPolicy.nightShiftRules,
                                            nightShiftAllowanceEnabled: !settings.advancedPolicy.nightShiftRules.nightShiftAllowanceEnabled
                                        }
                                    }
                                })}
                            />
                            <InputGroup
                                label="Night Shift Allowance Code"
                                type="text"
                                value={settings.advancedPolicy.nightShiftRules.nightShiftAllowanceCode || ''}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        nightShiftRules: {
                                            ...settings.advancedPolicy.nightShiftRules,
                                            nightShiftAllowanceCode: e.target.value
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="Separate OT for Night Shift"
                                description="Track overtime for night shifts separately"
                                active={!!settings.advancedPolicy.nightShiftRules.overtimeSeparateForNightShift}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        nightShiftRules: {
                                            ...settings.advancedPolicy.nightShiftRules,
                                            overtimeSeparateForNightShift: !settings.advancedPolicy.nightShiftRules.overtimeSeparateForNightShift
                                        }
                                    }
                                })}
                            />
                            <ToggleItem
                                label="3-Level Correction Workflow"
                                description="Employee → Manager → HR approval via Regularization module"
                                active={!!settings.advancedPolicy.manualCorrectionWorkflow.enabled}
                                onClick={() => setSettings({
                                    ...settings,
                                    advancedPolicy: {
                                        ...settings.advancedPolicy,
                                        manualCorrectionWorkflow: {
                                            ...settings.advancedPolicy.manualCorrectionWorkflow,
                                            enabled: !settings.advancedPolicy.manualCorrectionWorkflow.enabled
                                        }
                                    }
                                })}
                            />
                        </div>
                    </div>
                </div>
            </CollapsibleCard>

            {/* Global Save Button at Bottom */}
            <div className="col-span-1 md:col-span-2 flex justify-end mt-4 mb-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-slate-500/20 hover:bg-slate-900 hover:-translate-y-1 transition disabled:opacity-50 disabled:translate-y-0"
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}

function InputGroup({ label, ...props }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
            <input {...props} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition" />
        </div>
    );
}

function ToggleItem({ label, description, active, onClick }) {
    return (
        <div className="flex items-center gap-4 cursor-pointer group" onClick={onClick}>
            <div className={`transition-colors duration-300 ${active ? 'text-blue-500' : 'text-slate-300'}`}>
                {active ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
            </div>
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{description}</div>
            </div>
        </div>
    );
}

function CollapsibleCard({ title, icon, description, children }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
                        {icon || <Settings2 className="text-slate-500" />}
                    </div>
                    <div>
                        <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white uppercase tracking-widest">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                <div className="text-slate-400">
                    {open ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </div>
            </button>

            {open && (
                <div className="mt-6 space-y-4">
                    {children}
                </div>
            )}
        </div>
    );
}
