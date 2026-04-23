package httpserver

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/branchctx"
	"lekurax/internal/rbac"
)

type API struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterRoutes(r *gin.Engine, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	api := &API{db: db, audit: auditWriter, authz: authzClient}

	r.GET("/health/ready", api.healthReady)

	v1 := r.Group("/api/v1")

	authBranch := func(perm string) []gin.HandlerFunc {
		return []gin.HandlerFunc{
			auth.RequireAuth(verifier),
			authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
			branchctx.RequireBranchContext(),
			rbac.RequirePermission(perm),
		}
	}

	authOptionalBranch := func(perm string) []gin.HandlerFunc {
		return []gin.HandlerFunc{
			auth.RequireAuth(verifier),
			authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
			rbac.RequirePermission(perm),
		}
	}

	// Products (tenant-scoped)
	v1.POST("/products", append(authOptionalBranch("inventory.products.create"), api.createProduct)...)
	v1.GET("/products", append(authOptionalBranch("inventory.products.list"), api.listProducts)...)
	v1.GET("/products/:id", append(authOptionalBranch("inventory.products.view"), api.getProduct)...)
	v1.PATCH("/products/:id", append(authOptionalBranch("inventory.products.update"), api.updateProduct)...)

	// Pricing
	v1.PUT("/products/:id/price", append(authOptionalBranch("pricing.price.set"), api.setProductPrice)...)
	v1.POST("/pricing/quote", append(authOptionalBranch("pricing.quote"), api.quoteCart)...)
	v1.GET("/tax-rules", append(authOptionalBranch("pricing.quote"), api.listTaxRules)...)
	v1.POST("/tax-rules", append(authOptionalBranch("pricing.tax.manage"), api.createTaxRule)...)

	// Patients (tenant-scoped)
	v1.POST("/patients", append(authOptionalBranch("patients.create"), api.createPatient)...)
	v1.GET("/patients", append(authOptionalBranch("patients.list"), api.listPatients)...)
	v1.GET("/patients/:id", append(authOptionalBranch("patients.view"), api.getPatient)...)
	v1.PATCH("/patients/:id", append(authOptionalBranch("patients.update"), api.updatePatient)...)
	v1.POST("/patients/:id/allergies", append(authOptionalBranch("patients.allergies.manage"), api.addAllergy)...)
	v1.GET("/patients/:id/allergies", append(authOptionalBranch("patients.allergies.view"), api.listAllergies)...)

	// Branch-scoped inventory
	bg := v1.Group("/branches/:branch_id")
	bg.POST("/stock/receive", append(authBranch("inventory.stock.receive"), api.stockReceive)...)
	bg.POST("/stock/adjust", append(authBranch("inventory.stock.adjust"), api.stockAdjust)...)
	bg.GET("/stock", append(authBranch("inventory.stock.view"), api.listStock)...)
	bg.GET("/stock/near-expiry", append(authBranch("inventory.stock.view"), api.nearExpiry)...)

	// Prescriptions
	bg.POST("/prescriptions", append(authBranch("rx.create"), api.createRx)...)
	bg.GET("/prescriptions", append(authBranch("rx.list"), api.listRx)...)
	bg.GET("/prescriptions/:id", append(authBranch("rx.view"), api.getRx)...)
	bg.POST("/prescriptions/:id/items", append(authBranch("rx.items.manage"), api.addRxItem)...)
	bg.POST("/prescriptions/:id/submit", append(authBranch("rx.submit"), api.submitRx)...)
	bg.POST("/prescriptions/:id/dispense", append(authBranch("rx.dispense"), api.dispenseRx)...)

	// POS
	bg.POST("/sales", append(authBranch("pos.sales.create"), api.createSale)...)
	bg.GET("/sales", append(authBranch("pos.sales.list"), api.listSales)...)
	bg.GET("/sales/:id", append(authBranch("pos.sales.view"), api.getSale)...)
}

func isTenantAdmin(principal *auth.Principal) bool {
	if principal == nil {
		return false
	}
	for _, role := range principal.Roles {
		if role == "tenant-admin" || role == "tenant_admin" {
			return true
		}
	}
	return false
}
