import apiClient from './client';

/**
 * User REST endpoints (see BACKEND.md):
 *   GET  /api/users/{phone}
 *   POST /api/users        (multipart: phone, name?, profileImage?)
 *   PUT  /api/users/{id}   (multipart: name?, profileImage?)
 *
 * The backend returns the user JSON with `_id` and `profileImage` as an
 * absolute URL.
 */

export const fetchUser = async phone => {
  try {
    const response = await apiClient.get(`/users/${phone}`, {
      // A 404 here is the documented "new user" signal, not a real error.
      // Treat it as a valid outcome so it doesn't trip the global error
      // interceptor's noisy `API error [404]` log in client.js.
      validateStatus: status =>
        (status >= 200 && status < 300) || status === 404,
    });
    // 404 => the phone isn't registered yet (a new account).
    if (response.status === 404) {
      return undefined;
    }
    return response.data;
  } catch (error) {
    // Genuine failures only (network down, 5xx, timeout).
    console.log('fetchUser API error', error?.message);
    return undefined;
  }
};

export const saveUser = async formData => {
  const {data} = await apiClient.post('/users', formData, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
  return data;
};

export const updateUser = async (id, formData) => {
  const {data} = await apiClient.put(`/users/${id}`, formData, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
  return data;
};
