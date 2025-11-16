# API Route Mapping: Go → Python

This document shows how the Go backend routes map to the Python backend routes.

## ✅ Implemented Routes

| Go Route | Python Route | Method | Auth | Status |
|----------|--------------|--------|------|--------|
| `/health` | `/health` | GET | No | ✅ Implemented |
| `/api/ocr/scan` | `/api/ocr/scan` | POST | Yes | ✅ Implemented |
| `/api/ocr/jobs/:id` | `/api/ocr/jobs/{job_id}` | GET | Yes | ✅ Implemented |
| `/api/templates` | `/api/templates` | GET | Yes | ✅ Implemented |
| `/api/templates` | `/api/templates` | POST | Yes | ✅ Implemented |
| `/api/templates/:id` | `/api/templates/{id}` | GET | Yes | ✅ Implemented |
| `/api/templates/:id` | `/api/templates/{id}` | PATCH | Yes | ✅ Implemented |
| `/api/templates/:id` | `/api/templates/{id}` | DELETE | Yes | ✅ Implemented |
| `/api/files` | `/api/files` | GET | Yes | ✅ Implemented |
| `/api/files` | `/api/files` | POST | Yes | ✅ Implemented |
| `/api/files/:id` | `/api/files/{id}` | GET | Yes | ✅ Implemented |
| `/api/files/:id` | `/api/files/{id}` | PATCH | Yes | ✅ Implemented |
| `/api/files/:id` | `/api/files/{id}` | DELETE | Yes | ✅ Implemented |

## ⏳ Not Yet Implemented (Can Add Later)

These routes exist in the Go backend but are not in the MVP:

### Multi-Tenant Routes (Removed for Simplicity)
| Go Route | Reason |
|----------|--------|
| `/api/tenants` | Multi-tenancy not in MVP |
| `/api/tenants/:tenant_id` | Multi-tenancy not in MVP |
| `/api/tenant/:tenant_id/templates` | Multi-tenancy not in MVP |
| `/api/tenant/:tenant_id/files` | Multi-tenancy not in MVP |

### Template Forms
| Go Route | Reason |
|----------|--------|
| `/api/templates/:id/forms` | Form management - future feature |
| `/api/template/:id/forms/:form_id` | Form management - future feature |

### File Documents
| Go Route | Reason |
|----------|--------|
| `/api/files/:id/documents` | Document management - future feature |
| `/api/files/:id/documents/:doc_id` | Document management - future feature |

### Export
| Go Route | Reason |
|----------|--------|
| `/api/files/:id/export` | XML export - future feature |

### Static Files
| Go Route | Reason |
|----------|--------|
| `/static/*` | Frontend served separately |

## 🎯 Route Differences

### Parameter Style
- **Go**: Uses `:param` (e.g., `/api/files/:id`)
- **Python**: Uses `{param}` (e.g., `/api/files/{id}`)

Both are path parameters, just different syntax.

### Response Format
- **Go**: Manual JSON marshaling
- **Python**: Automatic Pydantic serialization

### Authentication
- **Go**: Custom middleware in `middleware/auth.go`
- **Python**: FastAPI dependency injection with `Depends(verify_token)`

## 📋 Request/Response Examples

### Create Template

**Go Request**:
```bash
PUT /api/templates
{
  "name": "Invoice Template",
  "description": "For processing invoices"
}
```

**Python Request** (same):
```bash
POST /api/templates
{
  "name": "Invoice Template",
  "description": "For processing invoices"
}
```

**Note**: Changed from PUT to POST (more RESTful for creation)

### OCR Scan

**Go Request**:
```bash
POST /api/ocr/scan
{
  "image": "base64_data",
  "language": "eng"
}
```

**Python Request**:
```bash
POST /api/ocr/scan
{
  "image_base64": "base64_data",
  "language": "eng"
}
```

**Note**: Renamed field to `image_base64` for clarity

## 🔧 Additional Python Routes

These are bonus routes not in the Go version:

| Route | Purpose | Method |
|-------|---------|--------|
| `/docs` | Swagger UI API documentation | GET |
| `/redoc` | ReDoc API documentation | GET |
| `/openapi.json` | OpenAPI schema | GET |

## 🚀 Testing Routes

### Using cURL

```bash
# Health check (no auth)
curl http://localhost:8080/health

# Get templates (with auth)
curl http://localhost:8080/api/templates \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create template (with auth)
curl -X POST http://localhost:8080/api/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Template"}'
```

### Using Swagger UI

1. Open `http://localhost:8080/docs`
2. Click "Authorize" button
3. Enter JWT token
4. Test endpoints interactively

## 📊 Route Coverage

- **Total Go Routes**: ~25
- **MVP Python Routes**: 14
- **Coverage**: ~56% (core functionality)
- **Missing**: Multi-tenancy, forms, documents, export

## 🎯 Migration Priority

If adding remaining routes:

1. **High Priority**:
   - Template forms upload
   - Document management
   - File export (XML)

2. **Medium Priority**:
   - Multi-tenancy support
   - Tenant-scoped resources

3. **Low Priority**:
   - Static file serving (use CDN/nginx)

---

**Note**: The MVP focuses on core OCR and template functionality. Additional routes can be added incrementally as needed.
