// LocalStorage Mock for Base44 Client

// Helper to interact with local storage
const getStorage = (key) => JSON.parse(localStorage.getItem(`mock_db_${key}`) || '[]');
const setStorage = (key, data) => localStorage.setItem(`mock_db_${key}`, JSON.stringify(data));

// Create a generic entity handler
const createEntityHandler = (entityName) => {
  return {
    list: async (sortBy) => {
      const data = getStorage(entityName);
      // Optional: implement simple sorting if needed
      if (sortBy && typeof sortBy === 'string') {
         const isDesc = sortBy.startsWith('-');
         const field = isDesc ? sortBy.slice(1) : sortBy;
         data.sort((a, b) => {
            if (a[field] < b[field]) return isDesc ? 1 : -1;
            if (a[field] > b[field]) return isDesc ? -1 : 1;
            return 0;
         });
      }
      return data;
    },
    filter: async (query) => {
      const data = getStorage(entityName);
      return data.filter(item => {
        return Object.keys(query).every(key => item[key] === query[key]);
      });
    },
    get: async (id) => {
      const data = getStorage(entityName);
      return data.find(item => item.id === id) || null;
    },
    create: async (payload) => {
      const data = getStorage(entityName);
      const newItem = { 
        id: 'id_' + Math.random().toString(36).substr(2, 9), 
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...payload 
      };
      data.push(newItem);
      setStorage(entityName, data);
      return newItem;
    },
    update: async (id, payload) => {
      const data = getStorage(entityName);
      const index = data.findIndex(item => item.id === id);
      if (index === -1) throw new Error(`Item ${id} not found in ${entityName}`);
      data[index] = { ...data[index], ...payload, updated_date: new Date().toISOString() };
      setStorage(entityName, data);
      return data[index];
    },
    delete: async (id) => {
      const data = getStorage(entityName);
      const filtered = data.filter(item => item.id !== id);
      setStorage(entityName, filtered);
      return true;
    }
  };
};

// Seed TeamMember so login works with "aa" and "bb"
const seedInitialData = () => {
  let members = getStorage('TeamMember');
  let updated = false;

  if (!members.find(m => m.employee_id === 'aa')) {
    members.push({
      id: 'admin_001',
      employee_id: 'aa',
      email: 'admin@satala.com',
      password: 'aa',
      full_name: 'Admin Satala',
      role: 'admin',
      status: 'aktif',
      created_date: new Date().toISOString(),
    });
    updated = true;
  }

  if (!members.find(m => m.employee_id === 'bb')) {
    members.push({
      id: 'dev_001',
      employee_id: 'bb',
      email: 'dev@satala.com',
      password: 'bb',
      full_name: 'Developer Satala',
      role: 'developer',
      status: 'aktif',
      created_date: new Date().toISOString(),
    });
    updated = true;
  }

  if (updated) {
    setStorage('TeamMember', members);
    console.log("Mock DB: TeamMembers seeded.");
  }
};
seedInitialData();

// We use a Proxy to dynamically handle any entity accessed via base44.entities.XYZ
export const base44 = {
  entities: new Proxy({}, {
    get: (target, prop) => {
      // Don't intercept React/JS internal symbols
      if (typeof prop === 'symbol' || prop === 'then') return target[prop];
      
      if (!target[prop]) {
        target[prop] = createEntityHandler(prop);
      }
      return target[prop];
    }
  }),
  functions: {
    invoke: async (name, payload) => {
      console.log(`Mock invoked function ${name}`, payload);
      return { success: true, message: 'Mocked function call' };
    }
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        return new Promise((resolve, reject) => {
          if (!file) return reject(new Error('No file provided'));
          const reader = new FileReader();
          reader.onload = (e) => resolve({ file_url: e.target.result });
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
      }
    }
  }
};