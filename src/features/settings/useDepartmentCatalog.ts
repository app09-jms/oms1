import { useCallback } from 'react';
import { useCatalogResource } from '@/hooks/useCatalogResource';
import {
  deleteDepartment,
  deleteDepartmentSafe,
  deletePosition,
  deletePositionSafe,
  fetchDepartmentCatalog,
  insertDepartment,
  insertPosition,
  renameDepartment,
  renamePosition,
} from '@/features/settings/settingsService';
import type { Department, Position } from '@/features/settings/settingsRules';

const LOAD_ERROR = 'Không thể tải danh mục bộ phận. Vui lòng thử lại.';

export function useDepartmentCatalog() {
  const load = useCallback(fetchDepartmentCatalog, []);
  const resource = useCatalogResource(load, LOAD_ERROR);
  const departments = resource.data?.departments ?? [];
  const positions = resource.data?.positions ?? [];

  function positionsOf(department: Department): Position[] {
    return positions.filter((position) => position.departmentId === department.id);
  }

  function addDepartment(name: string) {
    const nextSortOrder = (departments.at(-1)?.sortOrder ?? 0) + 1;
    return resource.runAction(() => insertDepartment(name, nextSortOrder), 'Không thể thêm bộ phận.');
  }

  function editDepartment(department: Department, name: string) {
    return resource.runAction(() => renameDepartment(department, name), 'Không thể cập nhật bộ phận.');
  }

  function removeDepartment(department: Department) {
    return resource.runAction(() => deleteDepartment(department), 'Không thể xóa bộ phận.');
  }

  function removeDepartmentSafe(oldName: string, newName: string | null) {
    return resource.runAction(() => deleteDepartmentSafe(oldName, newName), 'Không thể xóa bộ phận.');
  }

  function addPosition(department: Department, name: string) {
    return resource.runAction(() => insertPosition(department.id, name), 'Không thể thêm chức vụ.');
  }

  function editPosition(department: Department, position: Position, name: string) {
    return resource.runAction(() => renamePosition(department, position, name), 'Không thể cập nhật chức vụ.');
  }

  function removePosition(department: Department, position: Position) {
    return resource.runAction(() => deletePosition(department, position), 'Không thể xóa chức vụ.');
  }

  function removePositionSafe(oldName: string, newName: string | null) {
    return resource.runAction(() => deletePositionSafe(oldName, newName), 'Không thể xóa chức vụ.');
  }

  return {
    departments,
    positionsOf,
    isLoading: resource.isLoading,
    loadError: resource.loadError,
    isSaving: resource.isSaving,
    actionError: resource.actionError,
    clearActionError: resource.clearActionError,
    addDepartment,
    editDepartment,
    removeDepartment,
    removeDepartmentSafe,
    addPosition,
    editPosition,
    removePosition,
    removePositionSafe,
  };
}
