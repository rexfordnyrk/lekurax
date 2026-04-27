package authzkit

import (
	"context"
	"log"
)

// Permission is a single entry in the Lekurax permission manifest.
type Permission struct {
	Name     string `json:"name"`
	Label    string `json:"label"`
	Category string `json:"category"`
	Module   string `json:"module"`
}

// PermissionManifest returns the full canonical list of Lekurax permissions.
// Keep in sync with permission strings in internal/httpserver/api.go.
func PermissionManifest() []Permission {
	return []Permission{
		// Inventory — products
		{Name: "inventory.products.create", Label: "Create Products", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.products.list", Label: "List Products", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.products.view", Label: "View Product", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.products.update", Label: "Update Product", Category: "Lekurax", Module: "inventory"},
		// Inventory — stock
		{Name: "inventory.stock.receive", Label: "Receive Stock", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.stock.adjust", Label: "Adjust Stock", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.stock.view", Label: "View Stock", Category: "Lekurax", Module: "inventory"},
		// Pricing
		{Name: "pricing.price.set", Label: "Set Product Price", Category: "Lekurax", Module: "pricing"},
		{Name: "pricing.quote", Label: "Quote Cart", Category: "Lekurax", Module: "pricing"},
		{Name: "pricing.tax.manage", Label: "Manage Tax Rules", Category: "Lekurax", Module: "pricing"},
		// Patients
		{Name: "patients.create", Label: "Create Patient", Category: "Lekurax", Module: "patients"},
		{Name: "patients.list", Label: "List Patients", Category: "Lekurax", Module: "patients"},
		{Name: "patients.view", Label: "View Patient", Category: "Lekurax", Module: "patients"},
		{Name: "patients.update", Label: "Update Patient", Category: "Lekurax", Module: "patients"},
		{Name: "patients.allergies.manage", Label: "Manage Allergies", Category: "Lekurax", Module: "patients"},
		{Name: "patients.allergies.view", Label: "View Allergies", Category: "Lekurax", Module: "patients"},
		// Prescriptions
		{Name: "rx.create", Label: "Create Prescription", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.list", Label: "List Prescriptions", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.view", Label: "View Prescription", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.items.manage", Label: "Manage Rx Items", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.submit", Label: "Submit Prescription", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.dispense", Label: "Dispense Prescription", Category: "Lekurax", Module: "prescriptions"},
		// POS
		{Name: "pos.sales.create", Label: "Create Sale", Category: "Lekurax", Module: "pos"},
		{Name: "pos.sales.list", Label: "List Sales", Category: "Lekurax", Module: "pos"},
		{Name: "pos.sales.view", Label: "View Sale", Category: "Lekurax", Module: "pos"},
	}
}

type registerPermissionsRequest struct {
	Permissions []Permission `json:"permissions"`
}

// RegisterPermissions posts the full Lekurax permission manifest to the authz service.
// Failure is non-blocking: a warning is logged and the server continues.
func (c *Client) RegisterPermissions(ctx context.Context) {
	manifest := PermissionManifest()
	err := c.post(ctx, "/permissions/register", registerPermissionsRequest{Permissions: manifest})
	if err != nil {
		log.Printf("[startup] permission registration failed: %v", err)
		return
	}
	log.Printf("[startup] registered %d permissions with authz service", len(manifest))
}

// RegisterPermissionsOnce is the startup entry point. Safe to call with a nil client.
func RegisterPermissionsOnce(ctx context.Context, c *Client) {
	if c == nil {
		log.Print("[startup] authzkit client is nil; skipping permission registration")
		return
	}
	c.RegisterPermissions(ctx)
}
