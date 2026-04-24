package httpserver

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/auth"
	"lekurax/internal/branchctx"
)

func (a *API) healthReady(c *gin.Context) {
	if a.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "no_database"})
		return
	}
	sqlDB, err := a.db.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error"})
		return
	}
	if err := sqlDB.PingContext(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unreachable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func tenantID(c *gin.Context) uuid.UUID {
	return auth.GetPrincipal(c).TenantID
}

func actorID(c *gin.Context) *uuid.UUID {
	u := auth.GetPrincipal(c).UserID
	return &u
}

func branchUUID(c *gin.Context) (uuid.UUID, bool) {
	s := c.GetString(branchctx.ContextKey)
	if s == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

// --- Products ---

type createProductBody struct {
	Name            string  `json:"name"`
	GenericName     *string `json:"generic_name"`
	Manufacturer    *string `json:"manufacturer"`
	SKU             *string `json:"sku"`
	Barcode         *string `json:"barcode"`
	IsPrescription  bool    `json:"is_prescription"`
	IsControlled    bool    `json:"is_controlled"`
}

func (a *API) createProduct(c *gin.Context) {
	var body createProductBody
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	p := Product{
		ID:             uuid.New(),
		TenantID:       tenantID(c),
		Name:           strings.TrimSpace(body.Name),
		GenericName:    body.GenericName,
		Manufacturer:   body.Manufacturer,
		SKU:            body.SKU,
		Barcode:        body.Barcode,
		IsPrescription: body.IsPrescription,
		IsControlled:   body.IsControlled,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
	if err := a.db.WithContext(c.Request.Context()).Create(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "product.created", "product", &p.ID, map[string]any{"name": p.Name})
	c.JSON(http.StatusCreated, p)
}

func (a *API) listProducts(c *gin.Context) {
	var rows []Product
	q := a.db.WithContext(c.Request.Context()).Where("tenant_id = ?", tenantID(c)).Order("name ASC")
	if err := q.Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Product{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func (a *API) getProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var p Product
	if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ?", id, tenantID(c)).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	c.JSON(http.StatusOK, p)
}

type patchProductBody struct {
	Name           *string `json:"name"`
	GenericName    *string `json:"generic_name"`
	Manufacturer   *string `json:"manufacturer"`
	SKU            *string `json:"sku"`
	Barcode        *string `json:"barcode"`
	IsPrescription *bool   `json:"is_prescription"`
	IsControlled   *bool   `json:"is_controlled"`
}

func (a *API) updateProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var body patchProductBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	var p Product
	if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ?", id, tenantID(c)).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if body.Name != nil {
		p.Name = strings.TrimSpace(*body.Name)
	}
	if body.GenericName != nil {
		p.GenericName = body.GenericName
	}
	if body.Manufacturer != nil {
		p.Manufacturer = body.Manufacturer
	}
	if body.SKU != nil {
		p.SKU = body.SKU
	}
	if body.Barcode != nil {
		p.Barcode = body.Barcode
	}
	if body.IsPrescription != nil {
		p.IsPrescription = *body.IsPrescription
	}
	if body.IsControlled != nil {
		p.IsControlled = *body.IsControlled
	}
	p.UpdatedAt = time.Now().UTC()
	if err := a.db.WithContext(c.Request.Context()).Save(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "product.updated", "product", &p.ID, map[string]any{"name": p.Name})
	c.JSON(http.StatusOK, p)
}

// --- Pricing ---

type setPriceBody struct {
	Currency       string `json:"currency"`
	UnitPriceCents int64  `json:"unit_price_cents"`
}

func (a *API) setProductPrice(c *gin.Context) {
	pid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var body setPriceBody
	if err := c.ShouldBindJSON(&body); err != nil || body.UnitPriceCents < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	if strings.TrimSpace(body.Currency) == "" {
		body.Currency = "USD"
	}
	var pcount int64
	if err := a.db.WithContext(c.Request.Context()).Model(&Product{}).Where("id = ? AND tenant_id = ?", pid, tenantID(c)).Count(&pcount).Error; err != nil || pcount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}
	var existing ProductPrice
	err = a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND product_id = ?", tenantID(c), pid).First(&existing).Error
	now := time.Now().UTC()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		pp := ProductPrice{
			ID:             uuid.New(),
			TenantID:       tenantID(c),
			ProductID:      pid,
			Currency:       body.Currency,
			UnitPriceCents: body.UnitPriceCents,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if err := a.db.WithContext(c.Request.Context()).Create(&pp).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
			return
		}
		a.log(c, "price.set", "product_price", &pp.ID, map[string]any{"product_id": pid.String(), "unit_price_cents": body.UnitPriceCents})
		c.JSON(http.StatusOK, pp)
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	existing.Currency = body.Currency
	existing.UnitPriceCents = body.UnitPriceCents
	existing.UpdatedAt = now
	if err := a.db.WithContext(c.Request.Context()).Save(&existing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "price.set", "product_price", &existing.ID, map[string]any{"product_id": pid.String(), "unit_price_cents": body.UnitPriceCents})
	c.JSON(http.StatusOK, existing)
}

type quoteLine struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int64     `json:"quantity"`
	IsRx      bool      `json:"is_rx"`
}

type quoteRequest struct {
	Lines []quoteLine `json:"lines"`
}

func (a *API) quoteCart(c *gin.Context) {
	var req quoteRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Lines) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	tid := tenantID(c)
	var rules []TaxRule
	_ = a.db.WithContext(c.Request.Context()).Where("tenant_id = ?", tid).Find(&rules).Error

	var subtotal int64
	for _, line := range req.Lines {
		if line.Quantity <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_QUANTITY"})
			return
		}
		var price ProductPrice
		if err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND product_id = ?", tid, line.ProductID).First(&price).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "MISSING_PRICE", "product_id": line.ProductID.String()})
			return
		}
		subtotal += price.UnitPriceCents * line.Quantity
	}

	var tax int64
	for _, line := range req.Lines {
		var price ProductPrice
		_ = a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND product_id = ?", tid, line.ProductID).First(&price).Error
		lineTotal := price.UnitPriceCents * line.Quantity
		for _, tr := range rules {
			if line.IsRx && tr.AppliesToPrescription {
				tax += lineTotal * int64(tr.RateBps) / 10000
			}
			if !line.IsRx && tr.AppliesToOTC {
				tax += lineTotal * int64(tr.RateBps) / 10000
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"subtotal_cents": subtotal,
		"tax_cents":      tax,
		"total_cents":    subtotal + tax,
	})
}

func (a *API) listTaxRules(c *gin.Context) {
	var rules []TaxRule
	if err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ?", tenantID(c)).Order("name").Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rules == nil {
		rules = []TaxRule{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rules})
}

type taxRuleBody struct {
	Name                  string `json:"name"`
	RateBps               int    `json:"rate_bps"`
	AppliesToPrescription bool   `json:"applies_to_prescription"`
	AppliesToOTC          bool   `json:"applies_to_otc"`
}

func (a *API) createTaxRule(c *gin.Context) {
	var body taxRuleBody
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Name) == "" || body.RateBps < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	now := time.Now().UTC()
	tr := TaxRule{
		ID:                    uuid.New(),
		TenantID:              tenantID(c),
		Name:                  strings.TrimSpace(body.Name),
		RateBps:               body.RateBps,
		AppliesToPrescription: body.AppliesToPrescription,
		AppliesToOTC:          body.AppliesToOTC,
		CreatedAt:             now,
		UpdatedAt:             now,
	}
	if err := a.db.WithContext(c.Request.Context()).Create(&tr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "tax_rule.created", "tax_rule", &tr.ID, map[string]any{"name": tr.Name})
	c.JSON(http.StatusCreated, tr)
}

// --- Patients ---

type createPatientBody struct {
	FirstName   string  `json:"first_name"`
	LastName    string  `json:"last_name"`
	DateOfBirth *string `json:"date_of_birth"`
	Phone       *string `json:"phone"`
	Email       *string `json:"email"`
}

func parseDOB(s *string) (*time.Time, error) {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", strings.TrimSpace(*s))
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (a *API) createPatient(c *gin.Context) {
	var body createPatientBody
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.FirstName) == "" || strings.TrimSpace(body.LastName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	dob, err := parseDOB(body.DateOfBirth)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_DOB"})
		return
	}
	now := time.Now().UTC()
	pt := Patient{
		ID:          uuid.New(),
		TenantID:    tenantID(c),
		FirstName:   strings.TrimSpace(body.FirstName),
		LastName:    strings.TrimSpace(body.LastName),
		DateOfBirth: dob,
		Phone:       body.Phone,
		Email:       body.Email,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := a.db.WithContext(c.Request.Context()).Create(&pt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "patient.created", "patient", &pt.ID, map[string]any{"name": pt.LastName + ", " + pt.FirstName})
	c.JSON(http.StatusCreated, pt)
}

func (a *API) listPatients(c *gin.Context) {
	var rows []Patient
	if err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ?", tenantID(c)).Order("last_name, first_name").Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Patient{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func (a *API) getPatient(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var pt Patient
	if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ?", id, tenantID(c)).First(&pt).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	c.JSON(http.StatusOK, pt)
}

type patchPatientBody struct {
	FirstName   *string `json:"first_name"`
	LastName    *string `json:"last_name"`
	DateOfBirth *string `json:"date_of_birth"`
	Phone       *string `json:"phone"`
	Email       *string `json:"email"`
}

func (a *API) updatePatient(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var body patchPatientBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	var pt Patient
	if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ?", id, tenantID(c)).First(&pt).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if body.FirstName != nil {
		pt.FirstName = strings.TrimSpace(*body.FirstName)
	}
	if body.LastName != nil {
		pt.LastName = strings.TrimSpace(*body.LastName)
	}
	if body.DateOfBirth != nil {
		dob, err := parseDOB(body.DateOfBirth)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_DOB"})
			return
		}
		pt.DateOfBirth = dob
	}
	if body.Phone != nil {
		pt.Phone = body.Phone
	}
	if body.Email != nil {
		pt.Email = body.Email
	}
	pt.UpdatedAt = time.Now().UTC()
	if err := a.db.WithContext(c.Request.Context()).Save(&pt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "patient.updated", "patient", &pt.ID, nil)
	c.JSON(http.StatusOK, pt)
}

type allergyBody struct {
	Allergen string  `json:"allergen"`
	Reaction *string `json:"reaction"`
	Severity *string `json:"severity"`
}

func (a *API) addAllergy(c *gin.Context) {
	pid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var body allergyBody
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Allergen) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	var count int64
	if err := a.db.WithContext(c.Request.Context()).Model(&Patient{}).Where("id = ? AND tenant_id = ?", pid, tenantID(c)).Count(&count).Error; err != nil || count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}
	al := PatientAllergy{
		ID:        uuid.New(),
		TenantID:  tenantID(c),
		PatientID: pid,
		Allergen:  strings.TrimSpace(body.Allergen),
		Reaction:  body.Reaction,
		Severity:  body.Severity,
		CreatedAt: time.Now().UTC(),
	}
	if err := a.db.WithContext(c.Request.Context()).Create(&al).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "patient.allergy_added", "patient_allergy", &al.ID, map[string]any{"patient_id": pid.String()})
	c.JSON(http.StatusCreated, al)
}

func (a *API) listAllergies(c *gin.Context) {
	pid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var rows []PatientAllergy
	if err := a.db.WithContext(c.Request.Context()).Where("patient_id = ? AND tenant_id = ?", pid, tenantID(c)).Order("created_at DESC").Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []PatientAllergy{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

// --- Stock ---

type receiveBody struct {
	ProductID uuid.UUID `json:"product_id"`
	BatchNo   string    `json:"batch_no"`
	Quantity  int64     `json:"quantity"`
	ExpiresOn *string   `json:"expires_on"`
}

func (a *API) stockReceive(c *gin.Context) {
	bid, ok := branchUUID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "BRANCH_REQUIRED"})
		return
	}
	var body receiveBody
	if err := c.ShouldBindJSON(&body); err != nil || body.Quantity <= 0 || strings.TrimSpace(body.BatchNo) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	tid := tenantID(c)
	var pcount int64
	if err := a.db.WithContext(c.Request.Context()).Model(&Product{}).Where("id = ? AND tenant_id = ?", body.ProductID, tid).Count(&pcount).Error; err != nil || pcount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "PRODUCT_NOT_FOUND"})
		return
	}
	var exp *time.Time
	if body.ExpiresOn != nil && *body.ExpiresOn != "" {
		t, err := time.Parse("2006-01-02", strings.TrimSpace(*body.ExpiresOn))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_EXPIRY"})
			return
		}
		exp = &t
	}
	now := time.Now().UTC()
	var batch StockBatch
	err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND branch_id = ? AND product_id = ? AND batch_no = ?", tid, bid, body.ProductID, strings.TrimSpace(body.BatchNo)).First(&batch).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		batch = StockBatch{
			ID:             uuid.New(),
			TenantID:       tid,
			BranchID:       bid,
			ProductID:      body.ProductID,
			BatchNo:        strings.TrimSpace(body.BatchNo),
			ExpiresOn:      exp,
			QuantityOnHand: body.Quantity,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if err := a.db.WithContext(c.Request.Context()).Create(&batch).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	} else {
		batch.QuantityOnHand += body.Quantity
		if exp != nil {
			batch.ExpiresOn = exp
		}
		batch.UpdatedAt = now
		if err := a.db.WithContext(c.Request.Context()).Save(&batch).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
			return
		}
	}
	a.log(c, "stock.received", "stock_batch", &batch.ID, map[string]any{"product_id": body.ProductID.String(), "quantity": body.Quantity})
	c.JSON(http.StatusOK, batch)
}

type adjustBody struct {
	ProductID    uuid.UUID  `json:"product_id"`
	StockBatchID *uuid.UUID `json:"stock_batch_id"`
	Delta        int64      `json:"delta"`
	ReasonCode   string     `json:"reason_code"`
	Note         *string    `json:"note"`
}

func (a *API) stockAdjust(c *gin.Context) {
	bid, ok := branchUUID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "BRANCH_REQUIRED"})
		return
	}
	var body adjustBody
	if err := c.ShouldBindJSON(&body); err != nil || body.Delta == 0 || strings.TrimSpace(body.ReasonCode) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	tid := tenantID(c)
	var batch *StockBatch
	if body.StockBatchID != nil {
		var b StockBatch
		if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ? AND branch_id = ?", *body.StockBatchID, tid, bid).First(&b).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "BATCH_NOT_FOUND"})
			return
		}
		batch = &b
	} else {
		var b StockBatch
		if err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND branch_id = ? AND product_id = ?", tid, bid, body.ProductID).Order("expires_on NULLS LAST, created_at ASC").First(&b).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "NO_STOCK"})
			return
		}
		batch = &b
	}
	newQty := batch.QuantityOnHand + body.Delta
	if newQty < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NEGATIVE_STOCK"})
		return
	}
	batch.QuantityOnHand = newQty
	batch.UpdatedAt = time.Now().UTC()
	if err := a.db.WithContext(c.Request.Context()).Save(batch).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	adj := StockAdjustment{
		ID:           uuid.New(),
		TenantID:     tid,
		BranchID:     bid,
		ProductID:    body.ProductID,
		StockBatchID: &batch.ID,
		Delta:        body.Delta,
		ReasonCode:   strings.TrimSpace(body.ReasonCode),
		Note:         body.Note,
		ActorUserID:  actorID(c),
		CreatedAt:    time.Now().UTC(),
	}
	_ = a.db.WithContext(c.Request.Context()).Create(&adj).Error
	a.log(c, "stock.adjusted", "stock_adjustment", &adj.ID, map[string]any{"delta": body.Delta})
	c.JSON(http.StatusOK, batch)
}

func (a *API) listStock(c *gin.Context) {
	bid, ok := branchUUID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "BRANCH_REQUIRED"})
		return
	}
	var batches []StockBatch
	if err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND branch_id = ?", tenantID(c), bid).Order("batch_no").Find(&batches).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	items := make([]gin.H, 0, len(batches))
	for _, b := range batches {
		var p Product
		_ = a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ?", b.ProductID, tenantID(c)).First(&p).Error
		items = append(items, gin.H{
			"id":                b.ID,
			"tenant_id":         b.TenantID,
			"branch_id":         b.BranchID,
			"product_id":        b.ProductID,
			"product_name":      p.Name,
			"batch_no":          b.BatchNo,
			"expires_on":        b.ExpiresOn,
			"quantity_on_hand":  b.QuantityOnHand,
			"created_at":        b.CreatedAt,
			"updated_at":        b.UpdatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (a *API) nearExpiry(c *gin.Context) {
	bid, ok := branchUUID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "BRANCH_REQUIRED"})
		return
	}
	days := 30
	if d := c.Query("days"); d != "" {
		if n, err := strconv.Atoi(d); err == nil && n > 0 {
			days = n
		}
	}
	limit := time.Now().UTC().AddDate(0, 0, days).Format("2006-01-02")
	var batches []StockBatch
	err := a.db.WithContext(c.Request.Context()).
		Where("tenant_id = ? AND branch_id = ? AND expires_on IS NOT NULL AND expires_on <= ? AND quantity_on_hand > 0", tenantID(c), bid, limit).
		Order("expires_on ASC").
		Find(&batches).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	items := make([]gin.H, 0, len(batches))
	for _, b := range batches {
		var p Product
		_ = a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ?", b.ProductID, tenantID(c)).First(&p).Error
		items = append(items, gin.H{
			"id":               b.ID,
			"tenant_id":        b.TenantID,
			"branch_id":        b.BranchID,
			"product_id":       b.ProductID,
			"product_name":     p.Name,
			"batch_no":         b.BatchNo,
			"expires_on":       b.ExpiresOn,
			"quantity_on_hand": b.QuantityOnHand,
			"created_at":       b.CreatedAt,
			"updated_at":       b.UpdatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// --- Prescriptions ---

type createRxBody struct {
	PatientID      uuid.UUID `json:"patient_id"`
	PrescriberName *string   `json:"prescriber_name"`
	Notes          *string   `json:"notes"`
}

func (a *API) createRx(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	var body createRxBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	tid := tenantID(c)
	var pcount int64
	if err := a.db.WithContext(c.Request.Context()).Model(&Patient{}).Where("id = ? AND tenant_id = ?", body.PatientID, tid).Count(&pcount).Error; err != nil || pcount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PATIENT_NOT_FOUND"})
		return
	}
	now := time.Now().UTC()
	rx := Prescription{
		ID:             uuid.New(),
		TenantID:       tid,
		BranchID:       bid,
		PatientID:      body.PatientID,
		PrescriberName: body.PrescriberName,
		Notes:          body.Notes,
		Status:         "draft",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := a.db.WithContext(c.Request.Context()).Create(&rx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "rx.created", "prescription", &rx.ID, map[string]any{"branch_id": bid.String()})
	c.JSON(http.StatusCreated, rx)
}

func (a *API) listRx(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	var rows []Prescription
	if err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND branch_id = ?", tenantID(c), bid).Order("created_at DESC").Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Prescription{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func (a *API) getRx(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	rxid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var rx Prescription
	if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ? AND branch_id = ?", rxid, tenantID(c), bid).First(&rx).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	var items []PrescriptionItem
	_ = a.db.WithContext(c.Request.Context()).Where("prescription_id = ? AND tenant_id = ?", rxid, tenantID(c)).Find(&items).Error
	c.JSON(http.StatusOK, gin.H{"prescription": rx, "items": items})
}

type rxItemBody struct {
	ProductID  uuid.UUID `json:"product_id"`
	Quantity   int64     `json:"quantity"`
	Directions *string   `json:"directions"`
}

func (a *API) addRxItem(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	rxid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var body rxItemBody
	if err := c.ShouldBindJSON(&body); err != nil || body.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	tid := tenantID(c)
	var rx Prescription
	if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ? AND branch_id = ?", rxid, tid, bid).First(&rx).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rx.Status != "draft" {
		c.JSON(http.StatusConflict, gin.H{"error": "RX_NOT_EDITABLE"})
		return
	}
	var pcount int64
	if err := a.db.WithContext(c.Request.Context()).Model(&Product{}).Where("id = ? AND tenant_id = ?", body.ProductID, tid).Count(&pcount).Error; err != nil || pcount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PRODUCT_NOT_FOUND"})
		return
	}
	it := PrescriptionItem{
		ID:             uuid.New(),
		TenantID:       tid,
		PrescriptionID: rxid,
		ProductID:      body.ProductID,
		Quantity:       body.Quantity,
		Directions:     body.Directions,
		CreatedAt:      time.Now().UTC(),
	}
	if err := a.db.WithContext(c.Request.Context()).Create(&it).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "rx.item_added", "prescription_item", &it.ID, map[string]any{"prescription_id": rxid.String()})
	c.JSON(http.StatusCreated, it)
}

func (a *API) submitRx(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	rxid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	tid := tenantID(c)
	var rx Prescription
	if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ? AND branch_id = ?", rxid, tid, bid).First(&rx).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rx.Status != "draft" {
		c.JSON(http.StatusConflict, gin.H{"error": "INVALID_STATE"})
		return
	}
	var icount int64
	if err := a.db.WithContext(c.Request.Context()).Model(&PrescriptionItem{}).Where("prescription_id = ? AND tenant_id = ?", rxid, tid).Count(&icount).Error; err != nil || icount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NO_ITEMS"})
		return
	}
	rx.Status = "ready"
	rx.UpdatedAt = time.Now().UTC()
	if err := a.db.WithContext(c.Request.Context()).Save(&rx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "rx.submitted", "prescription", &rx.ID, nil)
	c.JSON(http.StatusOK, rx)
}

func (a *API) dispenseRx(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	rxid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	tid := tenantID(c)
	uid := auth.GetPrincipal(c).UserID

	err = a.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var rx Prescription
		if err := tx.Where("id = ? AND tenant_id = ? AND branch_id = ?", rxid, tid, bid).First(&rx).Error; err != nil {
			return err
		}
		if rx.Status != "ready" {
			return errInvalidRxState
		}
		var items []PrescriptionItem
		if err := tx.Where("prescription_id = ? AND tenant_id = ?", rxid, tid).Find(&items).Error; err != nil {
			return err
		}
		for _, it := range items {
			need := it.Quantity
			for need > 0 {
				var batch StockBatch
				q := tx.Where("tenant_id = ? AND branch_id = ? AND product_id = ? AND quantity_on_hand > 0", tid, bid, it.ProductID).
					Order("expires_on NULLS LAST, created_at ASC")
				if err := q.First(&batch).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						return errInsufficientStock
					}
					return err
				}
				take := batch.QuantityOnHand
				if take > need {
					take = need
				}
				batch.QuantityOnHand -= take
				batch.UpdatedAt = time.Now().UTC()
				if err := tx.Save(&batch).Error; err != nil {
					return err
				}
				need -= take
			}
		}
		rx.Status = "dispensed"
		rx.UpdatedAt = time.Now().UTC()
		if err := tx.Save(&rx).Error; err != nil {
			return err
		}
		disp := Dispensation{
			ID:             uuid.New(),
			TenantID:       tid,
			BranchID:       bid,
			PrescriptionID: rxid,
			ActorUserID:    &uid,
			CreatedAt:      time.Now().UTC(),
		}
		return tx.Create(&disp).Error
	})

	if errors.Is(err, errInsufficientStock) {
		c.JSON(http.StatusConflict, gin.H{"error": "INSUFFICIENT_STOCK"})
		return
	}
	if errors.Is(err, errInvalidRxState) {
		c.JSON(http.StatusConflict, gin.H{"error": "INVALID_STATE"})
		return
	}
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	var branchIDPtr *uuid.UUID
	bidCopy := bid
	branchIDPtr = &bidCopy
	a.logCtx(c.Request.Context(), tid, branchIDPtr, &uid, "rx.dispensed", "prescription", &rxid, map[string]any{"branch_id": bid.String()})

	var rx Prescription
	_ = a.db.WithContext(c.Request.Context()).Where("id = ?", rxid).First(&rx).Error
	c.JSON(http.StatusOK, rx)
}

var (
	errInsufficientStock = errors.New("insufficient stock")
	errInvalidRxState    = errors.New("invalid rx state")
)

// --- POS ---

type saleLineIn struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int64     `json:"quantity"`
	IsRx      bool      `json:"is_rx"`
}

type createSaleBody struct {
	PrescriptionID *uuid.UUID   `json:"prescription_id"`
	PatientID        *uuid.UUID   `json:"patient_id"`
	Currency         string       `json:"currency"`
	Lines            []saleLineIn `json:"lines"`
}

func (a *API) createSale(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	var body createSaleBody
	if err := c.ShouldBindJSON(&body); err != nil || len(body.Lines) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	if strings.TrimSpace(body.Currency) == "" {
		body.Currency = "USD"
	}
	tid := tenantID(c)
	uid := auth.GetPrincipal(c).UserID

	if body.PrescriptionID != nil {
		var rx Prescription
		if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ? AND branch_id = ?", *body.PrescriptionID, tid, bid).First(&rx).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "RX_NOT_FOUND"})
			return
		}
		if rx.Status != "dispensed" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "RX_NOT_DISPENSED"})
			return
		}
	}

	var rules []TaxRule
	_ = a.db.WithContext(c.Request.Context()).Where("tenant_id = ?", tid).Find(&rules).Error

	var subtotal int64
	lineTotals := make([]struct {
		productID uuid.UUID
		qty       int64
		isRx      bool
		lineTot   int64
		unitPrice int64
	}, 0, len(body.Lines))

	for _, line := range body.Lines {
		if line.Quantity <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_QUANTITY"})
			return
		}
		var price ProductPrice
		if err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND product_id = ?", tid, line.ProductID).First(&price).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "MISSING_PRICE", "product_id": line.ProductID.String()})
			return
		}
		lt := price.UnitPriceCents * line.Quantity
		subtotal += lt
		lineTotals = append(lineTotals, struct {
			productID uuid.UUID
			qty       int64
			isRx      bool
			lineTot   int64
			unitPrice int64
		}{line.ProductID, line.Quantity, line.IsRx, lt, price.UnitPriceCents})
	}

	var tax int64
	for _, lt := range lineTotals {
		for _, tr := range rules {
			if lt.isRx && tr.AppliesToPrescription {
				tax += lt.lineTot * int64(tr.RateBps) / 10000
			}
			if !lt.isRx && tr.AppliesToOTC {
				tax += lt.lineTot * int64(tr.RateBps) / 10000
			}
		}
	}

	sale := Sale{
		ID:             uuid.New(),
		TenantID:       tid,
		BranchID:       bid,
		PrescriptionID: body.PrescriptionID,
		PatientID:      body.PatientID,
		Currency:       body.Currency,
		SubtotalCents:  subtotal,
		TaxCents:       tax,
		TotalCents:     subtotal + tax,
		Status:         "paid",
		ActorUserID:    &uid,
		CreatedAt:      time.Now().UTC(),
	}

	txErr := a.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&sale).Error; err != nil {
			return err
		}
		for _, lt := range lineTotals {
			sl := SaleLine{
				ID:             uuid.New(),
				TenantID:       tid,
				SaleID:         sale.ID,
				ProductID:      lt.productID,
				Quantity:       lt.qty,
				UnitPriceCents: lt.unitPrice,
				LineTotalCents: lt.lineTot,
				CreatedAt:      time.Now().UTC(),
			}
			if err := tx.Create(&sl).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if txErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	a.log(c, "sale.created", "sale", &sale.ID, map[string]any{"total_cents": sale.TotalCents})
	c.JSON(http.StatusCreated, sale)
}

func (a *API) listSales(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	var rows []Sale
	if err := a.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND branch_id = ?", tenantID(c), bid).Order("created_at DESC").Limit(100).Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Sale{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func (a *API) getSale(c *gin.Context) {
	bid, err := uuid.Parse(c.Param("branch_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return
	}
	sid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}
	var sale Sale
	if err := a.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ? AND branch_id = ?", sid, tenantID(c), bid).First(&sale).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	var lines []SaleLine
	_ = a.db.WithContext(c.Request.Context()).Where("sale_id = ? AND tenant_id = ?", sid, tenantID(c)).Find(&lines).Error
	c.JSON(http.StatusOK, gin.H{"sale": sale, "lines": lines})
}
