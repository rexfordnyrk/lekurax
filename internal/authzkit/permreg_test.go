package authzkit_test

import (
	"os"
	"regexp"
	"strings"
	"testing"

	"lekurax/internal/authzkit"
)

var permissionNameRe = regexp.MustCompile(`"([a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,})"`)

func TestManifestCoversAllAPIPermissions(t *testing.T) {
	src, err := os.ReadFile("../../internal/httpserver/api.go")
	if err != nil {
		t.Fatalf("read api.go: %v", err)
	}

	matches := permissionNameRe.FindAllSubmatch(src, -1)
	var apiPerms []string
	for _, m := range matches {
		candidate := string(m[1])
		if strings.Contains(candidate, "/") {
			continue
		}
		apiPerms = append(apiPerms, candidate)
	}

	manifest := authzkit.PermissionManifest()
	manifestIndex := make(map[string]bool, len(manifest))
	for _, p := range manifest {
		manifestIndex[p.Name] = true
	}

	var missing []string
	for _, perm := range apiPerms {
		if !manifestIndex[perm] {
			missing = append(missing, perm)
		}
	}

	if len(missing) > 0 {
		t.Errorf("permissions in api.go missing from manifest:\n  %s", strings.Join(missing, "\n  "))
	}
}
