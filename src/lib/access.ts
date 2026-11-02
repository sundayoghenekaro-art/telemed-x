import { User, UserRole } from '@/types/dhos';

// Most privileged first: an account holding several roles gets the strongest one
export const STAFF_ROLE_PRIORITY: UserRole[] = [
  'admin',
  'physician',
  'nurse',
  'pharmacist',
  'radiologist',
  'lab_technician',
  'receptionist',
  'billing',
];

export type ScreenPermission =
  | 'screen:dashboard'
  | 'screen:patients'
  | 'screen:appointments'
  | 'screen:clinical'
  | 'screen:inpatient'
  | 'screen:laboratory'
  | 'screen:pharmacy'
  | 'screen:radiology'
  | 'screen:billing'
  | 'screen:telemedicine'
  | 'screen:monitoring'
  | 'screen:credentials'
  | 'screen:messages'
  | 'screen:hospitals'
  | 'screen:vendors'
  | 'screen:operations'
  | 'screen:settings'
  | 'screen:staff';

export type WidgetPermission =
  | 'widget:hospital_stats'
  | 'widget:inpatient_stats'
  | 'widget:bed_occupancy'
  | 'widget:critical_patients'
  | 'widget:today_appointments'
  | 'widget:pharmacy_queue'
  | 'widget:alerts';

export type ActionPermission =
  | 'action:register_patient'
  | 'action:book_appointment'
  | 'action:prescribe_medication'
  | 'action:verify_prescription'
  | 'action:dispense_medication'
  | 'action:manage_inventory'
  | 'action:order_lab_test'
  | 'action:validate_lab_result'
  | 'action:order_imaging'
  | 'action:write_radiology_report'
  | 'action:admit_patient'
  | 'action:discharge_patient'
  | 'action:create_invoice'
  | 'action:manage_billing'
  | 'action:manage_staff'
  | 'action:manage_queue'
  | 'action:check_insurance'
  | 'action:settle_insurance'
  | 'action:record_payment'
  | 'action:administer_medication'
  | 'action:acknowledge_critical_value'
  | 'action:manage_procurement'
  | 'action:manage_referral'
  | 'action:report_public_health';

export type Permission = ScreenPermission | WidgetPermission | ActionPermission;

export const ALL_PERMISSIONS: Permission[] = [
  'screen:dashboard',
  'screen:patients',
  'screen:appointments',
  'screen:clinical',
  'screen:inpatient',
  'screen:laboratory',
  'screen:pharmacy',
  'screen:radiology',
  'screen:billing',
  'screen:telemedicine',
  'screen:monitoring',
  'screen:credentials',
  'screen:messages',
  'screen:hospitals',
  'screen:vendors',
  'screen:operations',
  'screen:settings',
  'screen:staff',
  'widget:hospital_stats',
  'widget:inpatient_stats',
  'widget:bed_occupancy',
  'widget:critical_patients',
  'widget:today_appointments',
  'widget:pharmacy_queue',
  'widget:alerts',
  'action:register_patient',
  'action:book_appointment',
  'action:prescribe_medication',
  'action:verify_prescription',
  'action:dispense_medication',
  'action:manage_inventory',
  'action:order_lab_test',
  'action:validate_lab_result',
  'action:order_imaging',
  'action:write_radiology_report',
  'action:admit_patient',
  'action:discharge_patient',
  'action:create_invoice',
  'action:manage_billing',
  'action:manage_staff',
  'action:manage_queue',
  'action:check_insurance',
  'action:settle_insurance',
  'action:record_payment',
  'action:administer_medication',
  'action:acknowledge_critical_value',
  'action:manage_procurement',
  'action:manage_referral',
  'action:report_public_health',
];

// Clinical ordering belongs to the clinicians who are accountable for it, and
// invoices are raised by finance. Administrators run the platform and may see
// every screen, but they do not act on a patient's record or bill on their
// behalf.
const ADMIN_BLOCKED_ACTIONS: ActionPermission[] = [
  'action:prescribe_medication',
  'action:order_lab_test',
  'action:order_imaging',
  'action:create_invoice',
];

// Single source of truth for staff access. Navigation, route guards, dashboard
// widgets and action buttons all read this table, so they cannot drift apart.
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ALL_PERMISSIONS.filter(
    (permission) => !ADMIN_BLOCKED_ACTIONS.includes(permission as ActionPermission),
  ),

  physician: [
    'screen:dashboard',
    'screen:patients',
    'screen:appointments',
    'screen:clinical',
    'screen:inpatient',
    'screen:laboratory',
    'screen:pharmacy',
    'screen:radiology',
    'screen:telemedicine',
    'screen:monitoring',
    'screen:credentials',
    'screen:messages',
    'screen:operations',
    'widget:hospital_stats',
    'widget:inpatient_stats',
    'widget:bed_occupancy',
    'widget:critical_patients',
    'widget:today_appointments',
    'widget:pharmacy_queue',
    'widget:alerts',
    'action:book_appointment',
    'action:prescribe_medication',
    'action:verify_prescription',
    'action:order_lab_test',
    'action:validate_lab_result',
    'action:order_imaging',
    'action:admit_patient',
    'action:discharge_patient',
    'action:acknowledge_critical_value',
    'action:manage_referral',
    'action:report_public_health',
  ],

  nurse: [
    'screen:dashboard',
    'screen:patients',
    'screen:appointments',
    'screen:clinical',
    'screen:inpatient',
    'widget:hospital_stats',
    'widget:inpatient_stats',
    'widget:bed_occupancy',
    'widget:critical_patients',
    'widget:today_appointments',
    'widget:alerts',
    'action:book_appointment',
    'action:admit_patient',
    'action:discharge_patient',
    'action:manage_queue',
    'action:administer_medication',
    'action:acknowledge_critical_value',
    'action:report_public_health',
  ],

  // Pharmacy is prescription-driven: no hospital-wide patient directory and no
  // appointments or inpatient census.
  pharmacist: [
    'screen:dashboard',
    'screen:pharmacy',
    'screen:messages',
    'widget:pharmacy_queue',
    'widget:alerts',
    'action:verify_prescription',
    'action:dispense_medication',
    'action:manage_inventory',
    'action:manage_procurement',
  ],

  radiologist: [
    'screen:dashboard',
    'screen:radiology',
    'screen:messages',
    'widget:alerts',
    'action:order_imaging',
    'action:write_radiology_report',
    'action:acknowledge_critical_value',
  ],

  lab_technician: [
    'screen:dashboard',
    'screen:laboratory',
    'screen:messages',
    'widget:alerts',
    'action:order_lab_test',
    'action:validate_lab_result',
    'action:acknowledge_critical_value',
    'action:report_public_health',
  ],

  receptionist: [
    'screen:dashboard',
    'screen:patients',
    'screen:appointments',
    'screen:billing',
    'widget:hospital_stats',
    'widget:today_appointments',
    'widget:alerts',
    'action:register_patient',
    'action:book_appointment',
    'action:manage_queue',
    'action:check_insurance',
    'action:record_payment',
  ],

  billing: [
    'screen:dashboard',
    'screen:billing',
    'widget:alerts',
    'action:create_invoice',
    'action:manage_billing',
    'action:check_insurance',
    'action:settle_insurance',
    'action:record_payment',
  ],

  // Patients use the separate patient portal, not the staff application.
  patient: [],
};

const permissionSets = new Map<UserRole, Set<Permission>>(
  Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => [
    role as UserRole,
    new Set(permissions),
  ]),
);

export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return permissionSets.get(role)?.has(permission) ?? false;
}

export function canPerformAction(
  role: UserRole | null | undefined,
  action: ActionPermission,
): boolean {
  return hasPermission(role, action);
}

export function canSeeWidget(
  role: UserRole | null | undefined,
  widget: WidgetPermission,
): boolean {
  return hasPermission(role, widget);
}

export const ROUTE_PERMISSION: Record<string, ScreenPermission> = {
  '/dashboard': 'screen:dashboard',
  '/patients': 'screen:patients',
  '/appointments': 'screen:appointments',
  '/clinical': 'screen:clinical',
  '/inpatient': 'screen:inpatient',
  '/laboratory': 'screen:laboratory',
  '/pharmacy': 'screen:pharmacy',
  '/radiology': 'screen:radiology',
  '/billing': 'screen:billing',
  '/telemedicine': 'screen:telemedicine',
  '/monitoring': 'screen:monitoring',
  '/credentials': 'screen:credentials',
  '/messages': 'screen:messages',
  '/hospitals': 'screen:hospitals',
  '/vendors': 'screen:vendors',
  '/operations': 'screen:operations',
  '/settings': 'screen:settings',
  '/staff': 'screen:staff',
};

const ROUTE_LABEL: Record<string, string> = {
  '/dashboard': 'the dashboard',
  '/patients': 'patient records',
  '/appointments': 'Appointments',
  '/clinical': 'Clinical',
  '/inpatient': 'Currently in Hospital',
  '/laboratory': 'Laboratory',
  '/pharmacy': 'Pharmacy',
  '/radiology': 'Radiology',
  '/billing': 'Billing',
  '/telemedicine': 'Telemedicine',
  '/monitoring': 'Remote Patient Monitoring',
  '/credentials': 'Credentials',
  '/messages': 'Messages',
  '/hospitals': 'Hospitals',
  '/vendors': 'Vendors',
  '/operations': 'Operations',
  '/settings': 'Settings',
  '/staff': 'Staff accounts',
};

export function routeLabelFor(pathname: string): string | undefined {
  if (ROUTE_LABEL[pathname]) return ROUTE_LABEL[pathname];

  const match = Object.keys(ROUTE_LABEL)
    .filter((route) => pathname.startsWith(route + '/'))
    .sort((a, b) => b.length - a.length)[0];

  return match ? ROUTE_LABEL[match] : undefined;
}

function routePermissionFor(pathname: string): ScreenPermission | null {
  if (ROUTE_PERMISSION[pathname]) return ROUTE_PERMISSION[pathname];

  const match = Object.keys(ROUTE_PERMISSION)
    .filter((route) => pathname.startsWith(route + '/'))
    .sort((a, b) => b.length - a.length)[0];

  return match ? ROUTE_PERMISSION[match] : null;
}

function rolesWithPermission(permission: Permission): UserRole[] {
  return STAFF_ROLE_PRIORITY.filter((role) => hasPermission(role, permission));
}

// Derived role lists, kept for consumers that still describe routes by role.
export const ROUTE_ACCESS: Record<string, UserRole[]> = Object.fromEntries(
  Object.entries(ROUTE_PERMISSION).map(([route, permission]) => [
    route,
    rolesWithPermission(permission),
  ]),
);

export function routeAccessFor(pathname: string): UserRole[] | null {
  const permission = routePermissionFor(pathname);
  return permission ? rolesWithPermission(permission) : null;
}

export function canAccessRoute(role: UserRole | null | undefined, pathname: string): boolean {
  const permission = routePermissionFor(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}

export function canSearchPatients(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'screen:patients');
}

function normalizeDepartment(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function departmentMatches(scope: string, recordDepartment: string | null | undefined): boolean {
  if (!recordDepartment) return false;
  const a = normalizeDepartment(scope);
  const b = normalizeDepartment(recordDepartment);
  return a === b || a.includes(b) || b.includes(a);
}

// Only clinicians are scoped to their own department. Administrators and
// operational roles (billing, reception, pharmacy, lab, radiology) keep the
// cross-department view their job requires.
export function getDepartmentScope(
  user: Pick<User, 'role' | 'department'> | null | undefined,
): string | null {
  if (!user) return null;
  if (user.role !== 'physician' && user.role !== 'nurse') return null;
  return user.department?.trim() || null;
}

export function scopeByDepartment<T extends { department: string }>(
  items: T[],
  scope: string | null,
): T[] {
  return scope ? items.filter((item) => departmentMatches(scope, item.department)) : items;
}
