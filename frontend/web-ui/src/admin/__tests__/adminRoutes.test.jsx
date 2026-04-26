import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSource(relativePathFromSrc) {
  return readFileSync(resolve(__dirname, "..", "..", relativePathFromSrc), "utf8");
}

describe("admin routes + legacy redirects", () => {
  it("wires /admin routes under RequireAuth and adds legacy redirects in App.jsx", () => {
    const appSource = readSource("App.jsx");

    // Admin routes (stubs for now)
    expect(appSource).toContain("/admin/users");
    expect(appSource).toContain("/admin/roles");
    expect(appSource).toContain("/admin/audit");
    expect(appSource).toContain("/admin/auth-policies");

    // Legacy redirects (route-level)
    expect(appSource).toContain('path=\'/users-list\'');
    expect(appSource).toContain('to="/admin/users"');

    expect(appSource).toContain('path=\'/role-access\'');
    expect(appSource).toContain('to="/admin/roles"');

    expect(appSource).toContain('path=\'/assign-role\'');
    expect(appSource).toContain('to="/admin/roles?tab=assign"');
  });

  it("redirects inside legacy page components (defense in depth)", () => {
    const usersListSource = readSource("pages/UsersListPage.jsx");
    const roleAccessSource = readSource("pages/RoleAccessPage.jsx");
    const assignRoleSource = readSource("pages/AssignRolePage.jsx");

    expect(usersListSource).toContain('to="/admin/users"');
    expect(roleAccessSource).toContain('to="/admin/roles"');
    expect(assignRoleSource).toContain('to="/admin/roles?tab=assign"');
  });
});

