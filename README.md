# KTBS Web App V2

Built from the Kulu Travels KTBS workbook structure and the approved white/turquoise dashboard reference.

## Included
- Kulu Travels branded login
- Dashboard matching the approved white/cyan direction
- Client Master with searchable client records
- Functional Register/Edit Client form using the workbook's core fields
- Leads view
- Quotations with client lookup and pricing
- Bookings with financial fields
- Suppliers and Hotels
- Finance and payment recording
- Travel History
- Reports
- Settings
- Browser local storage persistence
- JSON backup export

## Demo login
Username: admin
Password: kulu123

## Important
This is a functional browser prototype. Data is saved in the browser's localStorage, not a shared production database. Production authentication, server database, role permissions, audit trail and secure deployment are the next stage.


## Fast-track milestone
Approved Kulu white/turquoise UI is locked. MVP workflow:
LOGIN → CLIENT → QUOTATION → BOOKING → PAYMENT → DASHBOARD.

This package is a browser-functional prototype. It uses localStorage for persistence.
For production, connect the same screens to a secure server database and authentication.


## Excel-style workflow implemented
1. Register and save client in Client Master.
2. Copy/paste the Client ID into a quotation.
3. KTBS finds the Client Master record and fills the client/travel information automatically.
4. Add hotels/services, quantities and unit amounts. Add discounts. Subtotal and total calculate automatically.
5. Save Quotation. KTBS automatically creates a linked Booking with the quotation total.
6. Open the Booking and enter client amount paid, supplier cost and supplier paid amount.
7. KTBS calculates client balance, supplier balance and gross profit.
8. Change Booking Status at any time: Quotation, Confirmed, Partially Paid, Fully Paid, In Progress, Completed or Cancelled.
9. Booking figures feed the Finance and Reports views automatically.


## Final requested workflow
- Leads & Enquiries removed from the main navigation.
- Quotation client field is a Client Master selector: choose an existing client and their saved information appears automatically.
- Quotation service field is a dropdown covering Kulu's current travel services, with an Other option.
- Saving a quotation creates a linked booking.
- Booking status is the master status and synchronizes to the linked quotation and client.
- Supplier and hotel records are persisted to their respective screens.
- Booking values feed Finance and Reports through the shared booking data.


## Client Travel History
Travel History is a dedicated saved record, but is also displayed inside each Client Profile. When a Booking status becomes Completed, KTBS automatically creates or updates the corresponding travel-history record. The history includes client, destination, travel dates, services/experiences, hotel/supplier, booking number and travel value.


## Final workflow updates
- Client Master now shows each client's completed Kulu trip count and latest completed destination.
- Client Profile contains full Travel History.
- Saving a Booking is a real form submit and updates linked quotation/client status.
- Booking supports supplier and hotel selections from their saved lists.
- Gross Profit = Selling - Supplier Cost.
- Net Profit = Gross Profit - Other Expenses.
- Booking data drives Finance and Reports.


## Performance optimization
Travel History is now cached and only rebuilt when completed-booking data changes. Client Master uses a precomputed history count instead of repeatedly scanning all history records for every client. Booking saves invalidate the cache once and then refresh only the required data.


## Payment & supplier payment fixes
- Client Paid is stored on the booking and reflected in the Booking Finance table and Finance summary.
- Supplier Pending Payment is shown as Supplier Cost minus Supplier Paid.
- Finance now shows Selling, Client Paid, Client Balance, Supplier Cost, Supplier Paid, Supplier Pending, Gross Profit and Net Profit.
- The prototype automatically removes the seeded demo "Test Client" and linked demo records on startup.


## Inline Supplier & Hotel creation
While creating or editing a Booking, staff can select an existing Supplier/Hotel or type a new name. Pressing Save next to the field immediately adds the new record to Suppliers or Hotels and makes it available in future booking dropdowns. This prevents duplicate data entry.


## Admin & Consultant Access
Admin has full control and can manage consultants and correct saved records. Consultant saved records are locked and consultants cannot edit them. Consultant management is Admin-only. The prototype includes role/session logic; production deployment should enforce these permissions server-side with authenticated accounts.

## Multi-tenant SaaS foundation (October 2026)

KTBS is being evolved from a single-agency system into a subscription platform for multiple tour and travel operators.

### Database foundation now applied
- Added an `organizations` table and organization memberships.
- Created the first organization, **Kulu Travels**, and linked the existing staff accounts to it.
- Added required `organization_id` ownership to clients, quotations, quotation items, bookings, client payments, supplier payments, expenses, suppliers, hotels, services and travel history.
- Added organization-aware row-level security policies so each operator's data is separated at the database layer.
- Added automatic organization assignment for new operational records and prevention of changing a record's organization.
- Scoped privileged booking access and booking-status synchronization to the active organization.
- Preserved consultant access to assigned-client records and supplier-payment recording, while restricting supplier-payment visibility and company financial records to organization administrators.
- Protected organization subscription status and slug from changes by tenant administrators.

### Application changes
- The signed-in workspace loads the current user's active organization and displays its name in the workspace header.
- The existing Kulu Travels workspace remains the first tenant.

### Phase 2 — limited trial onboarding (October 2026)

- Added the subscription-plan catalogue and organization-subscription records.
- Added a secure Supabase Edge Function, `ktbs-start-trial`, for business-owner invitation and workspace creation. The service-role key remains server-side.
- Added a registration form for business name, owner name, email, country and default currency.
- Trial length: **14 days** from workspace creation.
- Trial caps: **2 staff accounts including the owner, 100 clients, 25 quotations and 10 bookings**.
- Database triggers enforce trial limits and make expired, past-due, suspended or cancelled workspaces read-only for operational records.
- Added basic signup abuse protection using a hidden honeypot and hashed-IP attempt limits.
- Kulu Travels is marked active on the subscription layer and is not limited by the new trial caps.

### Remaining before public launch
1. Confirm Supabase Auth email invitation delivery and the allowed redirect URL.
2. Confirm the Vercel production deployment is publicly reachable while previews remain protected.
3. Test a complete external sign-up, email invite acceptance, login, workspace isolation and each trial cap.
4. Add a protected platform super-admin console.
5. Set commercial plan pricing and integrate payment collection (including a suitable Kenya payment method).
6. Complete cross-tenant and subscription-expiry tests.

**Important:** Trial infrastructure and the registration entry point have been added, but this is not yet a fully validated public launch. Paid subscription checkout, the platform super-admin console and end-to-end registration tests remain outstanding. Do not advertise paid subscriptions as available until these checks are complete.
