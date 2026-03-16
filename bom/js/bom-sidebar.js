/* ============================================
   BOM Dashboard - Sidebar Controller
   Handles collapse/expand, group toggle,
   permission filtering, active highlighting
   ============================================ */

const BomSidebar = (function() {
  let collapsed = false;
  const STORAGE_KEY = 'bom_sidebar_collapsed';

  function init() {
    // Restore collapsed state
    collapsed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (collapsed) {
      document.querySelector('.dashboard-layout')?.classList.add('sidebar-collapsed');
    }

    // Toggle button
    document.getElementById('sidebarToggle')?.addEventListener('click', toggle);

    // Group headers — toggle open/close
    document.querySelectorAll('.sidebar-group-header').forEach(function(header) {
      header.addEventListener('click', function() {
        var group = this.closest('.sidebar-group');
        if (group) group.classList.toggle('open');
      });
    });

    // Sidebar items — navigate to section
    document.querySelectorAll('.sidebar-item[data-section]').forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        var section = this.getAttribute('data-section');
        if (section) showSection(section);
        // Close mobile drawer
        closeMobileDrawer();
      });
    });

    // Mobile backdrop
    document.getElementById('sidebarBackdrop')?.addEventListener('click', closeMobileDrawer);

    // Open KPI group by default
    var kpiGroup = document.querySelector('.sidebar-group[data-group="kpi"]');
    if (kpiGroup) kpiGroup.classList.add('open');
  }

  function toggle() {
    collapsed = !collapsed;
    var layout = document.querySelector('.dashboard-layout');
    if (layout) {
      layout.classList.toggle('sidebar-collapsed', collapsed);
    }
    localStorage.setItem(STORAGE_KEY, collapsed);
  }

  function openMobileDrawer() {
    var sidebar = document.querySelector('.dash-sidebar');
    var backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    var sidebar = document.querySelector('.dash-sidebar');
    var backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  function setActive(sectionId) {
    // Remove active from all items
    document.querySelectorAll('.sidebar-item').forEach(function(item) {
      item.classList.remove('active');
    });
    // Set active on matching item
    var activeItem = document.querySelector('.sidebar-item[data-section="' + sectionId + '"]');
    if (activeItem) {
      activeItem.classList.add('active');
      // Open parent group
      var group = activeItem.closest('.sidebar-group');
      if (group) group.classList.add('open');
      // Highlight group header
      document.querySelectorAll('.sidebar-group-header').forEach(function(h) {
        h.classList.remove('group-active');
      });
      var groupHeader = group?.querySelector('.sidebar-group-header');
      if (groupHeader) groupHeader.classList.add('group-active');
    }
  }

  function filterByPermissions(permMap) {
    document.querySelectorAll('.sidebar-item[data-perm]').forEach(function(item) {
      var perm = item.getAttribute('data-perm');
      if (perm && permMap && typeof permMap[perm] !== 'undefined') {
        item.style.display = permMap[perm] ? '' : 'none';
      }
    });
    // Admin section
    var adminItem = document.querySelector('.sidebar-item.admin-item');
    if (adminItem) {
      adminItem.style.display = (permMap && permMap.isAdmin) ? '' : 'none';
    }
    // Hide empty groups
    document.querySelectorAll('.sidebar-group').forEach(function(group) {
      var visibleItems = group.querySelectorAll('.sidebar-item:not([style*="display: none"])');
      group.style.display = visibleItems.length > 0 ? '' : 'none';
    });
  }

  function updateBadge(sectionId, count) {
    var item = document.querySelector('.sidebar-item[data-section="' + sectionId + '"]');
    if (!item) return;
    var badge = item.querySelector('.item-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'item-badge';
        item.appendChild(badge);
      }
      badge.textContent = count;
      badge.style.display = '';
    } else if (badge) {
      badge.style.display = 'none';
    }
  }

  return {
    init: init,
    toggle: toggle,
    setActive: setActive,
    filterByPermissions: filterByPermissions,
    updateBadge: updateBadge,
    openMobileDrawer: openMobileDrawer,
    closeMobileDrawer: closeMobileDrawer
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  BomSidebar.init();
});
