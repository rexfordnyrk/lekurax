# Lekurax API ↔ UI Coverage Map (Evidence-Backed)

**Date:** 2026-04-25  
**Scope:**  
- **Lekurax API**: `/api/v1/*` (Go: Gin)  
- **AuthzKit API (consumed by Lekurax UI)**: `/v1/*` (Go: Gin)  
- **Frontend**: `frontend/web-ui` only  

## Legend

- **UI calls endpoint?**:
  - **YES**: UI route exists and the page contains a concrete call to the endpoint(s)
  - **PARTIAL**: UI calls some of the needed endpoints (or only read vs write)
  - **NO**: API exists but no UI call site exists
  - **none**: no UI route/page exists for the item

> Notes on AuthzKit SDK evidence: Lekurax UI uses `@authzkit/client` (`frontend/web-ui/src/auth/authzkitClient.js`). The SDK’s REST paths are evidenced in the vendored SDK source at `authz/frontend/packages/authzkit-client/src/resources/*` (used only to resolve `authzkit.*` method → `/v1/...` endpoint mapping).

---

## 1. User Management & Security

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **User Authentication**: Login/logout functionality with username and password | none | `POST /v1/auth/login`, `POST /v1/auth/logout` | `/sign-in` | YES | `frontend/web-ui/src/pages/SignInPage.jsx` | `authzkit.auth.login()`→`/auth/login`, `authzkit.auth.logout()`→`/auth/logout` |
| **User Authentication**: Multi-factor authentication (MFA) support | none | `POST /v1/auth/mfa/challenge`, `POST /v1/auth/mfa/totp/enroll`, `POST /v1/auth/mfa/totp/confirm`, `DELETE /v1/auth/mfa/totp`, `GET /v1/auth/mfa/recovery-codes/count` | none | NO | none | AuthzKit endpoints exist; no Lekurax UI flows evidenced |
| **User Authentication**: Password policies (complexity, expiration, history) | none | none | none | none | none | Not implemented in this repo |
| **User Authentication**: Session management and timeout controls | none | `POST /v1/auth/token/refresh`, `POST /v1/auth/logout-all` | none | PARTIAL | `frontend/web-ui/src/auth/AuthContext.jsx` | Refresh is handled implicitly by AuthzKit HTTP client; UI calls logout (not logout-all) |
| **User Authentication**: Single sign-on (SSO) capability | none | `GET /v1/auth/social/:provider/redirect`, `GET /v1/auth/social/:provider/callback` | none | NO | none | Endpoints exist; no UI call sites evidenced |
| **RBAC**: Predefined roles | none | `GET /v1/roles` | none | NO | none | Endpoint exists; no Lekurax UI page uses roles list |
| **RBAC**: Custom role creation with granular permission assignment | none | `POST /v1/roles`, `POST /v1/roles/:id/permissions` | none | NO | none | Not surfaced in Lekurax UI |
| **RBAC**: Permission management at module, feature, and data level | none | `GET /v1/permissions`, `POST /v1/permissions/register` | none | NO | none | Not surfaced in Lekurax UI |
| **RBAC**: Role hierarchy support (inherited permissions) | none | none | none | none | none | Not evidenced |
| **User Account Management**: Create, edit, suspend, and delete user accounts | none | `GET /v1/users`, `PUT /v1/users/:id`, `DELETE /v1/users/:id` | none | PARTIAL | `frontend/web-ui/src/lekurax/BranchUsersPage.jsx` | UI calls `authzkit.users.list()` but does not evidence update/delete flows |
| **User Account Management**: User profile management | none | `GET /v1/users/me`, `PUT /v1/users/me` | none | PARTIAL | `frontend/web-ui/src/auth/AuthContext.jsx` | UI refreshes `me`; no profile edit page evidenced |
| **User Account Management**: Password reset and recovery mechanisms | none | `POST /v1/auth/password/reset/request`, `POST /v1/auth/password/reset/confirm` | `/forgot-password` | PARTIAL | `frontend/web-ui/src/pages/ForgotPasswordPage.jsx` | Request is evidenced; confirm is not evidenced in UI |
| **User Account Management**: Account activation/deactivation workflows | none | none | none | none | none | Not implemented/evidenced |
| **Audit Logging**: Comprehensive activity logs | none | `GET /v1/audit-logs`, `GET /v1/admin/audit-logs` | none | NO | none | Lekurax writes audits internally but no audit log UI; Authz endpoints exist |
| **Audit Logging**: Login/logout tracking and failed attempts | none | none | none | none | none | Not evidenced |
| **Data Encryption & Security**: Data encryption at rest and in transit | n/a | n/a | n/a | n/a | n/a | Architectural requirement; not mapped to endpoints/pages |

---

## 2. Organization & Branch Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Organization Setup**: Company/pharmacy chain profile (name, logo, registration details, tax IDs) | none | none | none | none | none | Not implemented/evidenced |
| **Organization Setup**: Corporate hierarchy definition (headquarters, regional offices, branches) | none | `GET /v1/branches/tree` | none | NO | none | UI uses branch list, not tree |
| **Organization Setup**: Multi-tenant support for SaaS | n/a | n/a | n/a | n/a | n/a | Implemented as tenancy primitives; not a single endpoint/page |
| **Organization Setup**: Regulatory compliance information and licenses | none | none | none | none | none | Not implemented/evidenced |
| **Branch/Location Management**: Branch registration (name, address, contact information, license numbers) | none | `GET /v1/branches`, `POST /v1/branches` | `/lekurax/branches` | YES | `frontend/web-ui/src/lekurax/BranchesPage.jsx` | UI lists + creates branches via SDK |
| **Branch/Location Management**: Branch-specific settings (timezone, currency, language preferences) | none | `PUT /v1/branches/:branch_id` | none | NO | none | Endpoint exists; no UI evidenced |
| **Branch/Location Management**: Operational hours configuration (opening/closing times, holidays) | none | none | none | none | none | Not implemented/evidenced |
| **Branch/Location Management**: Branch status management (active/inactive/maintenance) | none | `PUT /v1/branches/:branch_id` | none | NO | none | Not surfaced in UI |
| **Branch/Location Management**: Geolocation data for delivery and mapping integrations | none | none | none | none | none | Not implemented/evidenced |
| **Branch-Specific User Assignment**: Assign users to one or multiple branches | none | `GET /v1/branches/:branch_id/users`, `POST /v1/branches/:branch_id/users`, `DELETE /v1/branches/:branch_id/users/:user_id` | `/lekurax/branches/:branchId/users` | YES | `frontend/web-ui/src/lekurax/BranchUsersPage.jsx` | UI assigns/unassigns and lists |
| **Branch-Specific User Assignment**: Branch-specific role assignments | none | `POST /v1/users/:id/roles`, `DELETE /v1/users/:id/roles/:roleId` | none | NO | none | Authz endpoints exist; no Lekurax UI evidenced |
| **Branch-Specific User Assignment**: Access restrictions based on branch assignment | `GET /api/v1/branches/:branch_id/ping` | `POST /v1/auth/branch/switch` | none | PARTIAL | `frontend/web-ui/src/api/lekuraxApi.js` | Lekurax API reads `X-Branch-Id` header; no UI call site to switch branch evidenced (likely via branch selector component, but not mapped here) |
| **Facility Management**: Storage area definitions | none | none | none | none | none | Not implemented/evidenced |
| **Facility Management**: Equipment registry | none | none | none | none | none | Not implemented/evidenced |
| **Facility Management**: Counter/workstation management | none | none | none | none | none | Not implemented/evidenced |
| **Facility Management**: Pharmacy layout configuration | none | none | none | none | none | Not implemented/evidenced |

---

## 3. Inventory Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Product Master Data Management**: Comprehensive drug database (generic name, brand name, manufacturer) | `GET /api/v1/products`, `POST /api/v1/products`, `GET /api/v1/products/:id`, `PATCH /api/v1/products/:id` | none | `/lekurax/products` | PARTIAL | `frontend/web-ui/src/lekurax/ProductsPage.jsx` | UI calls list+create; update/get-by-id not evidenced in UI |
| **Product Master Data Management**: Product categorization (Rx/OTC, controlled, refrigerated) | same as above | none | `/lekurax/products` | PARTIAL | `frontend/web-ui/src/lekurax/ProductsPage.jsx` | Depends on product schema; UI coverage limited to create/list |
| **Stock Level Management**: Real-time stock quantity tracking by branch | `GET /api/v1/branches/:branch_id/stock` | none | `/lekurax/stock` | YES | `frontend/web-ui/src/lekurax/StockPage.jsx` |  |
| **Stock Level Management**: Batch/lot number tracking with expiry dates | `POST /api/v1/branches/:branch_id/stock/receive`, `GET /api/v1/branches/:branch_id/stock/near-expiry` | none | `/lekurax/stock` | YES | `frontend/web-ui/src/lekurax/StockPage.jsx` | Near-expiry view uses endpoint; receive includes batch/expiry |
| **Stock Adjustments & Reconciliation**: Manual stock adjustments | `POST /api/v1/branches/:branch_id/stock/adjust` | none | `/lekurax/stock` | YES | `frontend/web-ui/src/lekurax/StockPage.jsx` |  |
| **Expiry Management**: Near-expiry alerts | `GET /api/v1/branches/:branch_id/stock/near-expiry` | none | `/lekurax/stock` | YES | `frontend/web-ui/src/lekurax/StockPage.jsx` |  |
| **Inter-Branch Stock Transfers**: Transfer requests, approvals, tracking | none | none | none | none | none | Not implemented/evidenced |
| **Controlled Substances Management**: Separate tracking + audits | none | none | none | none | none | Not implemented/evidenced |
| **Inventory Reporting & Analytics**: Stock status reports | `GET /api/v1/branches/:branch_id/reports/inventory/near-expiry` | none | `/lekurax/reports/inventory` | YES | `frontend/web-ui/src/pages/ReportsInventoryPage.jsx` | Limited to near-expiry report |

---

## 4. Supplier & Procurement Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Advanced Supplier Management**: Supplier contracts, certificates, ratings | none | none | none | none | none | Not implemented/evidenced |
| **Supplier Management (basic)**: Supplier database | `GET /api/v1/suppliers`, `POST /api/v1/suppliers` | none | `/lekurax/suppliers` | YES | `frontend/web-ui/src/pages/SuppliersPage.jsx` | Covers list + create only |
| **Purchase Requisition System**: Create requisition | `POST /api/v1/branches/:branch_id/requisitions` | none | `/lekurax/requisitions/new`, `/lekurax/requisitions/:id` | YES | `frontend/web-ui/src/pages/RequisitionDetailPage.jsx` |  |
| **Purchase Requisition System**: Add lines | `POST /api/v1/branches/:branch_id/requisitions/:id/lines` | none | `/lekurax/requisitions/:id` | YES | `frontend/web-ui/src/pages/RequisitionDetailPage.jsx` |  |
| **Purchase Requisition System**: Submit requisition | `POST /api/v1/branches/:branch_id/requisitions/:id/submit` | none | `/lekurax/requisitions/:id` | YES | `frontend/web-ui/src/pages/RequisitionDetailPage.jsx` |  |
| **Purchase Requisition System**: Approve / Reject | `POST /api/v1/branches/:branch_id/requisitions/:id/approve`, `POST /api/v1/branches/:branch_id/requisitions/:id/reject` | none | `/lekurax/requisitions/:id` | YES | `frontend/web-ui/src/pages/RequisitionDetailPage.jsx` |  |
| **Purchase Requisition System**: List requisitions | `GET /api/v1/branches/:branch_id/requisitions` | none | `/lekurax/requisitions` | YES | `frontend/web-ui/src/pages/RequisitionsPage.jsx` |  |
| **RFQ Management** | none | none | none | none | none | Not implemented/evidenced |
| **Contract Management** | none | none | none | none | none | Not implemented/evidenced |
| **Vendor Performance Analytics** | none | none | none | none | none | Not implemented/evidenced |
| **Payment Processing Integration (procurement)** | none | none | none | none | none | Not implemented/evidenced |

---

## 5. Product Catalog & Pricing Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Pricing Strategies**: Base pricing (cost plus markup) | `PUT /api/v1/products/:id/price` | none | `/lekurax/products` | YES | `frontend/web-ui/src/lekurax/ProductsPage.jsx` | UI sets price (note: UI uses `:product_id` variable; API is `:id`) |
| **Tax Configuration**: Product-specific tax rates | `GET /api/v1/tax-rules`, `POST /api/v1/tax-rules` | none | `/lekurax/tax-rules` | YES | `frontend/web-ui/src/lekurax/TaxRulesPage.jsx` |  |
| **Pricing at POS**: Quote totals | `POST /api/v1/pricing/quote` | none | `/lekurax/pos` | YES | `frontend/web-ui/src/lekurax/PosPage.jsx` | Used to compute cart totals |
| **Discount & Promotion Management** | none | none | none | none | none | Not implemented/evidenced |
| **Price List Management** | none | none | none | none | none | Not implemented/evidenced |

---

## 6. Customer & Patient Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Customer Registration**: Personal information capture | `GET /api/v1/patients`, `POST /api/v1/patients` | none | `/lekurax/patients` | YES | `frontend/web-ui/src/lekurax/PatientsPage.jsx` |  |
| **Patient Health Profile**: Allergy information | `GET /api/v1/patients/:id/allergies`, `POST /api/v1/patients/:id/allergies` | none | `/lekurax/patients/:id` | YES | `frontend/web-ui/src/lekurax/PatientDetailPage.jsx` |  |
| **Patient Health Profile**: Update patient profile | `GET /api/v1/patients/:id`, `PATCH /api/v1/patients/:id` | none | `/lekurax/patients/:id` | YES | `frontend/web-ui/src/lekurax/PatientDetailPage.jsx` |  |
| **Insurance & Payment Information**: Patient coverages | `GET /api/v1/patients/:id/coverages`, `POST /api/v1/patients/:id/coverages` | none | `/lekurax/patients/:id` | YES | `frontend/web-ui/src/lekurax/PatientDetailPage.jsx` |  |
| **Prescription History** | none | none | none | none | none | Not implemented/evidenced as a dedicated patient history endpoint/page |
| **Customer Communication** | none | none | none | none | none | Implemented via Notifications module (partial) |
| **Privacy & Consent Management** | none | none | none | none | none | Not implemented/evidenced |
| **Loyalty Program Management** | none | none | none | none | none | Not implemented/evidenced |

---

## 7. Prescription Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Prescription Entry**: Manual prescription entry | `GET /api/v1/branches/:branch_id/prescriptions`, `POST /api/v1/branches/:branch_id/prescriptions` | none | `/lekurax/prescriptions` | YES | `frontend/web-ui/src/lekurax/PrescriptionsPage.jsx` | UI also fetches patients/products for selection |
| **Prescription Processing**: Add prescription items | `POST /api/v1/branches/:branch_id/prescriptions/:id/items` | none | `/lekurax/prescriptions` | YES | `frontend/web-ui/src/lekurax/PrescriptionsPage.jsx` |  |
| **Prescription Processing**: Submit prescription | `POST /api/v1/branches/:branch_id/prescriptions/:id/submit` | none | `/lekurax/prescriptions` | YES | `frontend/web-ui/src/lekurax/PrescriptionsPage.jsx` |  |
| **Dispensing**: Dispense prescription (stock decrement) | `POST /api/v1/branches/:branch_id/prescriptions/:id/dispense` | none | `/lekurax/prescriptions` | YES | `frontend/web-ui/src/lekurax/PrescriptionsPage.jsx` |  |
| **Prescription Validation** (prescriber/patient checks, controlled rules, expiry) | none | none | none | none | none | Not implemented/evidenced |
| **Clinical Decision Support** (interactions/allergies/dosage) | none | none | none | none | none | Not implemented/evidenced |
| **Refill Management** | `POST /api/v1/portal/refills` | none | `/portal/prescriptions` | YES | `frontend/web-ui/src/pages/portal/PortalPrescriptionsPage.jsx` | Portal-only flow evidenced |
| **Insurance Adjudication** (rx-level) | none | none | none | none | none | Implemented via claims module (sale-based claim draft) |
| **Labels & Documentation** | none | none | none | none | none | Not implemented/evidenced |
| **Controlled Substance Prescriptions** | none | none | none | none | none | Not implemented/evidenced |

---

## 8. Point of Sale (POS) & Billing

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Sales Transaction Processing**: Walk-in sales (OTC) | `POST /api/v1/branches/:branch_id/sales` | none | `/lekurax/pos` | YES | `frontend/web-ui/src/lekurax/PosPage.jsx` |  |
| **Sales Transaction Processing**: Sales history list/view | `GET /api/v1/branches/:branch_id/sales`, `GET /api/v1/branches/:branch_id/sales/:id` | none | `/lekurax/sales` | YES | `frontend/web-ui/src/lekurax/SalesPage.jsx` |  |
| **Pricing & Discounts at POS**: Totals quote | `POST /api/v1/pricing/quote` | none | `/lekurax/pos` | YES | `frontend/web-ui/src/lekurax/PosPage.jsx` | Discounts not implemented |
| **Payment Processing**: Multiple payment methods | none | none | none | none | none | Not implemented/evidenced |
| **Receipt & Invoice Generation** | none | none | none | none | none | Not implemented/evidenced |
| **Returns & Refunds** | none | none | none | none | none | Not implemented/evidenced |
| **Cash Management** | none | none | none | none | none | Not implemented/evidenced |
| **Sales Reporting**: Sales summaries | `GET /api/v1/branches/:branch_id/reports/sales/summary` (also `GET /api/v1/reports/sales/summary`) | none | `/lekurax/reports/sales` | YES | `frontend/web-ui/src/pages/ReportsSalesPage.jsx` | UI uses branch-scoped summary |

---

## 9. Insurance & Claims Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Insurance Provider Management**: Insurance company database | `GET /api/v1/insurance/providers`, `POST /api/v1/insurance/providers` | none | `/lekurax/insurance/providers` | YES | `frontend/web-ui/src/pages/InsuranceProvidersPage.jsx` |  |
| **Insurance Provider Management**: Plan details | `GET /api/v1/insurance/plans`, `POST /api/v1/insurance/providers/:id/plans` | none | `/lekurax/insurance/plans` | YES | `frontend/web-ui/src/pages/InsurancePlansPage.jsx` |  |
| **Patient Insurance Verification** | none | none | none | none | none | Not implemented/evidenced |
| **Claims Submission**: Create claim draft from sale | `POST /api/v1/branches/:branch_id/claims` | none | none | NO | none | Endpoint exists; no UI evidence for create-draft flow |
| **Claims Submission**: Claim status tracking (list/view) | `GET /api/v1/branches/:branch_id/claims`, `GET /api/v1/branches/:branch_id/claims/:id` | none | `/lekurax/claims`, `/lekurax/claims/:id` | YES | `frontend/web-ui/src/pages/ClaimsPage.jsx`, `frontend/web-ui/src/pages/ClaimDetailPage.jsx` |  |
| **Adjudication Processing**: Adjudicate | `POST /api/v1/branches/:branch_id/claims/:id/adjudicate` | none | `/lekurax/claims/:id` | YES | `frontend/web-ui/src/pages/ClaimDetailPage.jsx` |  |
| **Claims Submission**: Submit claim | `POST /api/v1/branches/:branch_id/claims/:id/submit` | none | `/lekurax/claims/:id` | YES | `frontend/web-ui/src/pages/ClaimDetailPage.jsx` |  |
| **Reimbursement Tracking**: Mark paid | `POST /api/v1/branches/:branch_id/claims/:id/mark-paid` | none | `/lekurax/claims/:id` | YES | `frontend/web-ui/src/pages/ClaimDetailPage.jsx` |  |
| **Rejection Management / Prior Auth** | none | none | none | none | none | Not implemented/evidenced |
| **Insurance Reporting & Analytics** | none | none | none | none | none | Not implemented/evidenced |

---

## 10. Clinical Services & Consultation

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| Service catalog management | none | none | none | none | none | Not implemented/evidenced |
| Appointment scheduling | none | none | none | none | none | Not implemented/evidenced |
| Immunization management | none | none | none | none | none | Not implemented/evidenced |
| MTM | none | none | none | none | none | Not implemented/evidenced |
| Health screenings | none | none | none | none | none | Not implemented/evidenced |
| Clinical documentation | none | none | none | none | none | Not implemented/evidenced |
| Billing for clinical services | none | none | none | none | none | Not implemented/evidenced |

---

## 11. Reporting & Analytics

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Operational Reports**: Inventory near-expiry | `GET /api/v1/branches/:branch_id/reports/inventory/near-expiry` | none | `/lekurax/reports/inventory` | YES | `frontend/web-ui/src/pages/ReportsInventoryPage.jsx` |  |
| **Operational Reports**: Prescription volume | `GET /api/v1/branches/:branch_id/reports/prescriptions/volume` | none | `/lekurax/reports/prescriptions` | YES | `frontend/web-ui/src/pages/ReportsPrescriptionsPage.jsx` |  |
| **Financial Reports**: Sales summary | `GET /api/v1/branches/:branch_id/reports/sales/summary` | none | `/lekurax/reports/sales` | YES | `frontend/web-ui/src/pages/ReportsSalesPage.jsx` |  |
| Inventory analytics (ABC, turnover, dead stock, etc.) | none | none | none | none | none | Not implemented/evidenced |
| Customer analytics | none | none | none | none | none | Not implemented/evidenced |
| Regulatory & compliance reports | none | none | none | none | none | Not implemented/evidenced |
| Custom reporting / report builder | none | none | none | none | none | Not implemented/evidenced |
| Executive dashboards | none | none | none | none | none | Not implemented/evidenced |

---

## 12. Integration & Interoperability

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Third-Party Application APIs**: Webhook support | `GET /api/v1/integrations/webhooks`, `POST /api/v1/integrations/webhooks`, `POST /api/v1/integrations/webhooks/:id/events` | none | `/lekurax/integrations/webhooks` | YES | `frontend/web-ui/src/pages/IntegrationsWebhooksPage.jsx` | Covers create/list + emit test event |
| E-prescription integration (HL7/FHIR) | none | none | none | none | none | Not implemented/evidenced |
| Insurance gateway integration | none | none | none | none | none | Not implemented/evidenced |
| PMP/PDMP integration | none | none | none | none | none | Not implemented/evidenced |
| Drug information databases | none | none | none | none | none | Not implemented/evidenced |
| Accounting integration | none | none | none | none | none | Not implemented/evidenced |
| Payment gateway integration | none | none | none | none | none | Not implemented/evidenced |
| Data synchronization / offline | none | none | none | none | none | Not implemented/evidenced |

---

## 13. Notifications & Communications

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **System Alerts & Notifications**: In-app inbox | `GET /api/v1/notifications`, `POST /api/v1/notifications/:id/read` | none | `/lekurax/notifications` | YES | `frontend/web-ui/src/pages/NotificationsInboxPage.jsx` | Read/unread filtering via query |
| Customer notifications (SMS/email) | none | none | none | none | none | Not implemented/evidenced |
| Notification templates library | none | none | none | none | none | Not implemented/evidenced |
| Multi-channel delivery | none | none | none | none | none | Not implemented/evidenced |
| Delivery tracking analytics | none | none | none | none | none | Not implemented/evidenced |

---

## 14. Mobile & Online Services

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Customer Web Portal**: Portal home | none | none | `/portal` | NO | none | Route exists; no API calls evidenced |
| **Customer Web Portal**: Prescription history viewing | `GET /api/v1/portal/prescriptions` | none | `/portal/prescriptions` | YES | `frontend/web-ui/src/pages/portal/PortalPrescriptionsPage.jsx` |  |
| **Online Prescription Refill**: Refill request submission | `POST /api/v1/portal/refills` | none | `/portal/prescriptions` | YES | `frontend/web-ui/src/pages/portal/PortalPrescriptionsPage.jsx` |  |
| Appointment booking | none | none | none | none | none | Not implemented/evidenced |
| Medication information, reminders | none | none | none | none | none | Not implemented/evidenced |
| Digital payments | none | none | none | none | none | Not implemented/evidenced |
| Loyalty & rewards | none | none | none | none | none | Not implemented/evidenced |
| Customer support (chat/FAQ) | none | none | none | none | none | Not implemented/evidenced |

---

## 15. Delivery & Logistics Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Courier Management**: Courier registration and profile management | `GET /api/v1/couriers`, `POST /api/v1/couriers` | none | `/lekurax/couriers` | YES | `frontend/web-ui/src/pages/CouriersPage.jsx` |  |
| **Delivery Order Management**: Create delivery order | `POST /api/v1/branches/:branch_id/deliveries` | none | `/lekurax/deliveries` | YES | `frontend/web-ui/src/pages/DeliveriesPage.jsx` |  |
| **Dispatch & Assignment**: Assign courier | `POST /api/v1/branches/:branch_id/deliveries/:id/assign` | none | `/lekurax/deliveries` | YES | `frontend/web-ui/src/pages/DeliveriesPage.jsx` |  |
| **Delivery Tracking**: Update status | `POST /api/v1/branches/:branch_id/deliveries/:id/status` | none | `/lekurax/deliveries` | YES | `frontend/web-ui/src/pages/DeliveriesPage.jsx` |  |
| **Delivery Tracking**: List deliveries | `GET /api/v1/branches/:branch_id/deliveries` | none | `/lekurax/deliveries` | YES | `frontend/web-ui/src/pages/DeliveriesPage.jsx` |  |
| Route optimization / cold chain management | none | none | none | none | none | Not implemented/evidenced |
| Customer delivery portal tracking | none | none | none | none | none | Not implemented/evidenced |

---

## 16. Document Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Document Storage & Organization**: List documents | `GET /api/v1/documents` | none | `/lekurax/documents` | YES | `frontend/web-ui/src/pages/DocumentsPage.jsx` | UI fetches list; uses manual `fetch` with auth header in some cases |
| **Document Storage & Organization**: Upload document | `POST /api/v1/documents` | none | `/lekurax/documents` | NO | none | Endpoint exists; no UI call site evidenced for upload |
| Prescription image management / OCR | none | none | none | none | none | Not implemented/evidenced |
| Regulatory document management | none | none | none | none | none | Not implemented/evidenced |
| Document workflow / e-signatures | none | none | none | none | none | Not implemented/evidenced |

---

## 17. Training & Knowledge Management

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Training Program Management**: Course catalog list/create | `GET /api/v1/training/courses`, `POST /api/v1/training/courses` | none | `/lekurax/training/courses` | YES | `frontend/web-ui/src/pages/TrainingCoursesPage.jsx` |  |
| **Competency Tracking / Records**: Assign + complete course | `POST /api/v1/training/courses/:id/assign`, `POST /api/v1/training/courses/:id/complete` | none | `/lekurax/training/courses/:id` | YES | `frontend/web-ui/src/pages/TrainingCourseDetailPage.jsx` |  |
| Knowledge base / forums | none | none | none | none | none | Not implemented/evidenced |

---

## 18. Quality Assurance & Compliance

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| **Incident Reporting**: Create incident | `POST /api/v1/branches/:branch_id/incidents` | none | `/lekurax/incidents` | YES | `frontend/web-ui/src/pages/IncidentsPage.jsx` |  |
| **Incident Reporting**: List incidents | `GET /api/v1/branches/:branch_id/incidents` | none | `/lekurax/incidents` | YES | `frontend/web-ui/src/pages/IncidentsPage.jsx` |  |
| **Medication Error Management / CAPA**: Add CAPA | `POST /api/v1/branches/:branch_id/incidents/:id/capa` | none | `/lekurax/incidents/:id` | YES | `frontend/web-ui/src/pages/IncidentDetailPage.jsx` | Detail page fetches incident list then filters |
| Audit management / risk registry / dashboards | none | none | none | none | none | Not implemented/evidenced |

---

## 19. System Administration & Configuration

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|
| System monitoring / health | `GET /health/live`, `GET /health/ready` | `GET /health/live`, `GET /health/ready`, `GET /metrics` | none | none | none | Operational endpoints; no UI page |
| Integration configuration (admin) | none | none | `/lekurax/integrations/webhooks` | PARTIAL | `frontend/web-ui/src/pages/IntegrationsWebhooksPage.jsx` | Only webhooks are implemented |
| License & subscription management | none | none | none | none | none | Not implemented/evidenced |

