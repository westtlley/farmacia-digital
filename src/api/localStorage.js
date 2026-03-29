const NON_CRITICAL_ENTITIES = ['Promotion', 'BlogPost', 'Banner', 'ImportLog'];

class LocalStorageDB {
  constructor() {
    this.init();
  }

  init() {
    NON_CRITICAL_ENTITIES.forEach((entity) => {
      if (!localStorage.getItem(`db_${entity}`)) {
        localStorage.setItem(`db_${entity}`, JSON.stringify([]));
      }
    });
  }

  getAll(entity) {
    const data = localStorage.getItem(`db_${entity}`);
    return data ? JSON.parse(data) : [];
  }

  getById(entity, id) {
    return this.getAll(entity).find((item) => item.id === id);
  }

  filter(entity, filters = {}, sortBy = '', limit = null) {
    let items = this.getAll(entity);

    if (filters && Object.keys(filters).length > 0) {
      items = items.filter((item) =>
        Object.entries(filters).every(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            return true;
          }

          const itemValue = item[key];
          if (itemValue === undefined || itemValue === null) {
            return false;
          }

          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }

          return itemValue === value;
        })
      );
    }

    if (sortBy) {
      const isDesc = sortBy.startsWith('-');
      const field = isDesc ? sortBy.slice(1) : sortBy;

      items.sort((a, b) => {
        let left = a[field];
        let right = b[field];

        if (field.includes('date')) {
          left = new Date(left || 0).getTime();
          right = new Date(right || 0).getTime();
        }

        if (typeof left === 'string') {
          left = left.toLowerCase();
          right = (right || '').toLowerCase();
        }

        if (left < right) return isDesc ? 1 : -1;
        if (left > right) return isDesc ? -1 : 1;
        return 0;
      });
    }

    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }

    return items;
  }

  create(entity, data) {
    const items = this.getAll(entity);
    const newItem = {
      id: `${entity.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };

    items.push(newItem);
    localStorage.setItem(`db_${entity}`, JSON.stringify(items));
    return newItem;
  }

  update(entity, id, data) {
    const items = this.getAll(entity);
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error(`${entity} with id ${id} not found`);
    }

    items[index] = {
      ...items[index],
      ...data,
      updated_date: new Date().toISOString(),
    };

    localStorage.setItem(`db_${entity}`, JSON.stringify(items));
    return items[index];
  }

  delete(entity, id) {
    const items = this.getAll(entity).filter((item) => item.id !== id);
    localStorage.setItem(`db_${entity}`, JSON.stringify(items));
    return { success: true };
  }
}

export const db = new LocalStorageDB();
