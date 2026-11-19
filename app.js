const API_URL = 'http://localhost:3000';
const DEMO_DATABASE_KEY = 'paanilink_demo_database';
const CURRENT_USER_KEY = 'currentUser';
const isGitHubPages = window.location.hostname.endsWith('github.io');

const loginSection = document.getElementById('loginSection');
const logoutBtn = document.getElementById('logoutBtn');
const dashboards = document.querySelectorAll('.dashboard');

async function initializeData() {
  if (!isGitHubPages) {
    return;
  }

  if (localStorage.getItem(DEMO_DATABASE_KEY)) {
    return;
  }

  try {
    const response = await fetch('./db.json');
    if (!response.ok) {
      throw new Error(`Unable to load db.json (HTTP ${response.status})`);
    }

    const database = await response.json();
    if (!database || typeof database !== 'object' || Array.isArray(database)) {
      throw new Error('db.json does not contain a valid database object');
    }

    localStorage.setItem(DEMO_DATABASE_KEY, JSON.stringify(database));
  } catch (error) {
    console.error('PaaniLink could not initialize data from db.json:', error);
    throw new Error('The demo database could not be loaded. Please try again or reset the demo data.');
  }
}

function getDemoDatabase() {
  const storedDatabase = localStorage.getItem(DEMO_DATABASE_KEY);
  if (!storedDatabase) {
    throw new Error('Demo database is not initialized');
  }

  try {
    return JSON.parse(storedDatabase);
  } catch (error) {
    console.error('PaaniLink found invalid demo data in localStorage:', error);
    throw new Error('The saved demo database is invalid');
  }
}

function saveDemoDatabase(database) {
  localStorage.setItem(DEMO_DATABASE_KEY, JSON.stringify(database));
}

async function getCollection(collectionName) {
  if (isGitHubPages) {
    const database = getDemoDatabase();
    if (!Object.prototype.hasOwnProperty.call(database, collectionName)) {
      throw new Error(`Collection "${collectionName}" does not exist`);
    }
    if (!Array.isArray(database[collectionName])) {
      throw new Error(`Collection "${collectionName}" is not a valid list`);
    }
    return database[collectionName];
  }

  try {
    const response = await fetch(`${API_URL}/${collectionName}`);
    if (!response.ok) {
      throw new Error(`JSON Server returned HTTP ${response.status}`);
    }
    const collection = await response.json();
    if (!Array.isArray(collection)) {
      throw new Error(`Collection "${collectionName}" is not a valid list`);
    }
    return collection;
  } catch (error) {
    console.error(`PaaniLink could not read collection "${collectionName}" from JSON Server:`, error);
    throw new Error('Cannot connect to the local JSON Server.');
  }
}

async function getRecord(collectionName, id) {
  const collection = await getCollection(collectionName);
  const record = collection.find((item) => Number(item.id) === Number(id));
  if (!record) {
    throw new Error(`Requested ${collectionName} record does not exist`);
  }
  return record;
}

async function createRecord(collectionName, record) {
  if (isGitHubPages) {
    const database = getDemoDatabase();
    if (!Array.isArray(database[collectionName])) {
      throw new Error(`Collection "${collectionName}" does not exist`);
    }

    const numericIds = database[collectionName]
      .map((item) => Number(item.id))
      .filter((itemId) => Number.isFinite(itemId));
    const newId = numericIds.length ? Math.max(...numericIds) + 1 : 1;
    const newRecord = { ...record, id: newId };
    database[collectionName].push(newRecord);
    saveDemoDatabase(database);
    return newRecord;
  }

  try {
    const response = await fetch(`${API_URL}/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!response.ok) {
      throw new Error(`JSON Server returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`PaaniLink could not create a ${collectionName} record:`, error);
    throw new Error('Could not save the data. Check that JSON Server is running.');
  }
}

async function updateRecord(collectionName, id, changes) {
  if (isGitHubPages) {
    const database = getDemoDatabase();
    if (!Array.isArray(database[collectionName])) {
      throw new Error(`Collection "${collectionName}" does not exist`);
    }

    const index = database[collectionName].findIndex((item) => Number(item.id) === Number(id));
    if (index === -1) {
      throw new Error(`Requested ${collectionName} record does not exist`);
    }

    database[collectionName][index] = {
      ...database[collectionName][index],
      ...changes
    };
    saveDemoDatabase(database);
    return database[collectionName][index];
  }

  try {
    const response = await fetch(`${API_URL}/${collectionName}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes)
    });
    if (!response.ok) {
      throw new Error(`JSON Server returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`PaaniLink could not update ${collectionName}/${id}:`, error);
    throw new Error('Could not update the data. Check that JSON Server is running.');
  }
}

async function deleteRecord(collectionName, id) {
  if (isGitHubPages) {
    const database = getDemoDatabase();
    if (!Array.isArray(database[collectionName])) {
      throw new Error(`Collection "${collectionName}" does not exist`);
    }

    const index = database[collectionName].findIndex((item) => Number(item.id) === Number(id));
    if (index === -1) {
      throw new Error(`Requested ${collectionName} record does not exist`);
    }

    const deleted = database[collectionName].splice(index, 1)[0];
    saveDemoDatabase(database);
    return deleted;
  }

  try {
    const response = await fetch(`${API_URL}/${collectionName}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`JSON Server returned HTTP ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error(`PaaniLink could not delete ${collectionName}/${id}:`, error);
    throw new Error('Could not delete the data. Check that JSON Server is running.');
  }
}

// Existing API function names remain as adapters for the dashboard code.
async function getData(endpoint) {
  return getCollection(endpoint);
}

async function addData(endpoint, data) {
  return createRecord(endpoint, data);
}

async function updateData(endpoint, id, data) {
  return updateRecord(endpoint, id, data);
}

async function deleteData(endpoint, id) {
  return deleteRecord(endpoint, id);
}

// Removes temporary browser demo data. Run resetDemoData() from the console to start fresh.
function resetDemoData() {
  localStorage.removeItem(DEMO_DATABASE_KEY);
  window.location.reload();
}

function getLoggedUser() {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch (error) {
    console.error('PaaniLink found invalid currentUser data:', error);
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

function saveLoggedUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearLoggedUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function showDashboard(role) {
  const dashboardMap = {
    customer: 'customerDashboard',
    'zone-officer': 'zoneOfficerDashboard',
    'hydrant-operator': 'hydrantOperatorDashboard',
    driver: 'driverDashboard',
    admin: 'adminDashboard'
  };

  const activeDashboardId = dashboardMap[role] || null;

  dashboards.forEach((dashboard) => {
    dashboard.classList.toggle('hidden', dashboard.id !== activeDashboardId);
  });

  if (activeDashboardId) {
    loginSection.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    loginSection.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}

// Login page logic. It checks email, password and selected role.
async function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  try {
    const users = await getCollection('users');
    if (!Array.isArray(users)) {
      throw new Error('The users collection is missing or invalid');
    }

    const normalizedEmail = email.toLowerCase();
    const user = users.find((item) =>
      typeof item.email === 'string' &&
      item.email.trim().toLowerCase() === normalizedEmail &&
      item.password === password
    );

    if (!user) {
      alert('Invalid email or password.');
      return;
    }

    const knownRoles = ['customer', 'zone-officer', 'hydrant-operator', 'driver', 'admin'];
    if (!knownRoles.includes(user.role)) {
      console.error(`PaaniLink login found an unknown role: ${user.role}`);
      alert('This account has an unknown role.');
      return;
    }

    saveLoggedUser(user);
    showDashboard(user.role);
    await loadRoleData(user.role);
  } catch (error) {
    console.error('PaaniLink login failed:', error);
    alert(error.message === 'Demo database is not initialized'
      ? 'The demo database could not be loaded. Please refresh and try again.'
      : 'Unable to sign in. Check the data source and try again.');
  }
}

function logoutUser() {
  clearLoggedUser();
  showDashboard(null);
  document.getElementById('loginForm').reset();
}

async function loadRoleData(role) {
  if (role === 'customer') {
    loadCustomerBookings();
  }

  if (role === 'zone-officer') {
    loadSubsidyApplications();
    loadPendingSubsidisedBookings();
    loadOfficerDisputes();
  }

  if (role === 'hydrant-operator') {
    loadHydrantOperatorData();
  }

  if (role === 'driver') {
    loadDriverTrips();
  }

  if (role === 'admin') {
    loadAdminData();
  }
}

// Customer dashboard functions.
async function loadCustomerBookings() {
  const user = getLoggedUser();
  const bookings = await getData('bookings');
  const customerBookings = bookings.filter((item) => item.customerId === user.id);

  const table = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Type</th>
          <th>Address</th>
          <th>Date</th>
          <th>Size</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${customerBookings
          .map(
            (booking) => `
              <tr>
                <td>${booking.id}</td>
                <td>${booking.bookingType}</td>
                <td>${booking.address}</td>
                <td>${booking.deliveryDate}</td>
                <td>${booking.tankerSize}</td>
                <td>${booking.status}</td>
                <td>
                  ${booking.status === 'Pending Approval' ? `<button class="btn danger" data-action="cancel" data-id="${booking.id}">Cancel</button>` : ''}
                  ${booking.status === 'Delivered' ? `<button class="btn success" data-action="confirm" data-id="${booking.id}">Confirm</button>` : ''}
                  ${booking.status === 'Delivered' ? `<button class="btn warning" data-action="dispute" data-id="${booking.id}">Dispute</button>` : ''}
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;

  document.getElementById('customerBookings').innerHTML = table;
}

async function createBooking(event) {
  event.preventDefault();
  const user = getLoggedUser();
  const bookingType = document.getElementById('bookingType').value;
  const address = document.getElementById('bookingAddress').value.trim();
  const deliveryDate = document.getElementById('bookingDate').value;
  const tankerSize = Number(document.getElementById('bookingSize').value);

  if (!address || !deliveryDate) {
    alert('Please fill in address and delivery date.');
    return;
  }

  const today = new Date();
  const selectedDate = new Date(deliveryDate);
  if (selectedDate <= today) {
    alert('Delivery date must be in the future.');
    return;
  }

  const users = await getData('users');
  const customer = users.find((item) => item.id === user.id);

  if (bookingType === 'Subsidised' && customer.subsidyStatus !== 'Approved') {
    alert('Subsidised booking is only allowed for approved customers.');
    return;
  }

  const booking = {
    customerId: user.id,
    bookingType,
    address,
    deliveryDate,
    tankerSize,
    status: 'Pending Approval',
    createdAt: new Date().toISOString()
  };

  await addData('bookings', booking);
  alert('Booking created successfully.');
  document.getElementById('bookingForm').reset();
  loadCustomerBookings();
}

async function submitSubsidy(event) {
  event.preventDefault();
  const user = getLoggedUser();
  const proof = document.getElementById('subsidyProof').value.trim();
  const type = document.getElementById('subsidyType').value;

  if (!proof) {
    alert('Proof details are required.');
    return;
  }

  const application = {
    customerId: user.id,
    applicantType: type,
    proofDetails: proof,
    status: 'Pending'
  };

  await addData('subsidyApplications', application);
  alert('Subsidy application submitted.');
  document.getElementById('subsidyForm').reset();
}

async function cancelBooking(id) {
  await updateData('bookings', id, { status: 'Cancelled' });
  loadCustomerBookings();
}

async function confirmBooking(id) {
  await updateData('bookings', id, { status: 'Confirmed' });
  loadCustomerBookings();
}

async function disputeBooking(id) {
  const reason = prompt('Enter dispute reason:');
  if (!reason) return;

  const user = getLoggedUser();
  await addData('disputes', {
    bookingId: id,
    customerId: user.id,
    reason,
    status: 'Pending'
  });
  await updateData('bookings', id, { status: 'Disputed' });
  loadCustomerBookings();
}

// Zone Officer dashboard functions.
async function loadSubsidyApplications() {
  const user = getLoggedUser();
  const applications = await getData('subsidyApplications');
  const zoneApplications = applications.filter((item) => item.zoneId === user.zoneId);

  document.getElementById('subsidyApplications').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Customer</th><th>Type</th><th>Proof</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${zoneApplications
          .map(
            (app) => `
              <tr>
                <td>${app.id}</td>
                <td>${app.customerId}</td>
                <td>${app.applicantType}</td>
                <td>${app.proofDetails}</td>
                <td><span class="status ${app.status === 'Approved' ? 'approved' : app.status === 'Rejected' ? 'rejected' : 'pending'}">${app.status}</span></td>
                <td>
                  ${app.status === 'Pending' ? `<button class="btn success" data-role="officer" data-action="approve-subsidy" data-id="${app.id}">Approve</button>
                  <button class="btn danger" data-role="officer" data-action="reject-subsidy" data-id="${app.id}">Reject</button>` : ''}
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

async function loadPendingSubsidisedBookings() {
  const user = getLoggedUser();
  const bookings = await getData('bookings');
  const pending = bookings.filter((item) => item.zoneId === user.zoneId && item.bookingType === 'Subsidised' && item.status === 'Pending Approval');

  document.getElementById('pendingSubsidisedBookings').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Customer</th><th>Address</th><th>Type</th><th>Size</th><th>Action</th></tr></thead>
      <tbody>
        ${pending
          .map(
            (item) => `
              <tr>
                <td>${item.id}</td>
                <td>${item.customerId}</td>
                <td>${item.address}</td>
                <td>${item.bookingType}</td>
                <td>${item.tankerSize}</td>
                <td>
                  <button class="btn success" data-role="officer" data-action="approve-booking" data-id="${item.id}">Approve</button>
                  <button class="btn danger" data-role="officer" data-action="reject-booking" data-id="${item.id}">Reject</button>
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

async function loadOfficerDisputes() {
  const user = getLoggedUser();
  const disputes = await getData('disputes');
  const zoneDisputes = disputes.filter((item) => item.zoneId === user.zoneId);

  document.getElementById('officerDisputes').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Booking</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${zoneDisputes
          .map(
            (item) => `
              <tr>
                <td>${item.id}</td>
                <td>${item.bookingId}</td>
                <td>${item.reason}</td>
                <td>${item.status}</td>
                <td>${item.status === 'Pending' ? `<button class="btn success" data-role="officer" data-action="resolve-dispute" data-id="${item.id}">Resolve</button>` : ''}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

// Hydrant Operator dashboard functions.
async function loadHydrantOperatorData() {
  const user = getLoggedUser();
  const hydra = (await getData('hydrants')).find((item) => item.id === user.hydrantId);
  const bookings = await getData('bookings');
  const tankers = await getData('tankers');
  const drivers = await getData('users').then((items) => items.filter((item) => item.role === 'driver'));
  const approved = bookings.filter((item) => item.hydrantId === user.hydrantId && item.status === 'Approved');

  document.getElementById('hydrantSummary').innerHTML = `
    <p><strong>Hydrant:</strong> ${hydra.name}</p>
    <p><strong>Quota:</strong> ${hydra.dailyQuota}</p>
    <p><strong>Used:</strong> ${hydra.usedQuota}</p>
    <p><strong>Remaining:</strong> ${hydra.dailyQuota - hydra.usedQuota}</p>
    <p><strong>Status:</strong> ${hydra.status}</p>
  `;

  document.getElementById('approvedBookings').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Address</th><th>Size</th><th>Tanker</th><th>Driver</th><th>Action</th></tr></thead>
      <tbody>
        ${approved
          .map(
            (item) => `
              <tr>
                <td>${item.id}</td>
                <td>${item.address}</td>
                <td>${item.tankerSize}</td>
                <td>
                  <select data-tanker-for="${item.id}">
                    ${tankers
                      .filter((tanker) => tanker.hydrantId === user.hydrantId && tanker.status === 'Available')
                      .map((tanker) => `<option value="${tanker.id}">${tanker.registration}</option>`)
                      .join('')}
                  </select>
                </td>
                <td>
                  <select data-driver-for="${item.id}">
                    ${drivers
                      .filter((driver) => driver.status === 'Available')
                      .map((driver) => `<option value="${driver.id}">${driver.name}</option>`)
                      .join('')}
                  </select>
                </td>
                <td><button class="btn primary" data-role="operator" data-action="assign" data-id="${item.id}">Assign</button></td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

// Driver dashboard functions.
async function loadDriverTrips() {
  const user = getLoggedUser();
  const trips = await getData('trips');
  const bookings = await getData('bookings');
  const tankers = await getData('tankers');

  const assignedTrips = trips.filter((trip) => trip.driverId === user.id);

  document.getElementById('driverTrips').innerHTML = assignedTrips
    .map((trip) => {
      const booking = bookings.find((item) => item.id === trip.bookingId);
      const tanker = tankers.find((item) => item.id === trip.tankerId);

      return `
        <div class="trip-item">
          <p><strong>Trip ID:</strong> ${trip.id}</p>
          <p><strong>Address:</strong> ${booking ? booking.address : ''}</p>
          <p><strong>Tanker:</strong> ${tanker ? tanker.registration : ''}</p>
          <p><strong>Status:</strong> <span class="status ${trip.status === 'Delivered' ? 'approved' : trip.status === 'Failed' ? 'rejected' : 'pending'}">${trip.status}</span></p>
          <div class="card-grid">
            ${trip.status === 'Assigned' ? `<button class="btn success" data-role="driver" data-action="arrived" data-id="${trip.id}">Arrived</button>` : ''}
            ${trip.status === 'Arrived' ? `<button class="btn success" data-role="driver" data-action="delivered" data-id="${trip.id}">Delivered</button>` : ''}
            ${(trip.status === 'Assigned' || trip.status === 'Arrived') ? `<button class="btn danger" data-role="driver" data-action="failed" data-id="${trip.id}">Failed</button>` : ''}
          </div>
        </div>
      `;
    })
    .join('') || '<p>No trips assigned to this driver.</p>';
}

// Admin dashboard functions.
async function loadAdminData() {
  const users = await getData('users');
  const zones = await getData('zones');
  const hydrants = await getData('hydrants');
  const tankers = await getData('tankers');
  const rates = await getData('rates');
  const bookings = await getData('bookings');

  document.getElementById('adminUsers').innerHTML = `<ul>${users.map((user) => `<li>${user.name} - ${user.role}</li>`).join('')}</ul>`;
  document.getElementById('adminZones').innerHTML = `<ul>${zones.map((zone) => `<li>${zone.name}</li>`).join('')}</ul>`;
  document.getElementById('adminHydrants').innerHTML = `<ul>${hydrants.map((item) => `<li>${item.name}</li>`).join('')}</ul>`;
  document.getElementById('adminTankers').innerHTML = `<ul>${tankers.map((item) => `<li>${item.registration}</li>`).join('')}</ul>`;
  document.getElementById('adminRates').innerHTML = `<ul>${rates.map((item) => `<li>${item.type} - ${item.rate}</li>`).join('')}</ul>`;
  document.getElementById('adminSummary').innerHTML = `<p>Total bookings: ${bookings.length}</p>`;
}

async function handleRoleAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const role = button.dataset.role;

  if (role === 'officer') {
    if (action === 'approve-subsidy') {
      await updateData('subsidyApplications', id, { status: 'Approved' });
    }

    if (action === 'reject-subsidy') {
      const reason = prompt('Enter rejection reason:');
      if (!reason) return;
      await updateData('subsidyApplications', id, { status: 'Rejected', reason });
    }

    if (action === 'approve-booking') {
      await updateData('bookings', id, { status: 'Approved' });
    }

    if (action === 'reject-booking') {
      const reason = prompt('Enter rejection reason:');
      if (!reason) return;
      await updateData('bookings', id, { status: 'Rejected', reason });
    }

    if (action === 'resolve-dispute') {
      await updateData('disputes', id, { status: 'Resolved' });
    }

    loadSubsidyApplications();
    loadPendingSubsidisedBookings();
    loadOfficerDisputes();
  }

  if (role === 'operator') {
    if (action === 'assign') {
      const tankerId = document.querySelector(`[data-tanker-for="${id}"]`).value;
      const driverId = document.querySelector(`[data-driver-for="${id}"]`).value;

      if (!tankerId || !driverId) {
        alert('Please select both a tanker and a driver.');
        return;
      }

      const booking = (await getData('bookings')).find((item) => item.id === id);
      const tanker = (await getData('tankers')).find((item) => item.id === Number(tankerId));
      const driver = (await getData('users')).find((item) => item.id === Number(driverId));

      if (!booking || !tanker || !driver) {
        alert('Assignment data is missing.');
        return;
      }

      await updateData('bookings', id, { status: 'Assigned' });
      await addData('trips', {
        bookingId: id,
        driverId: Number(driverId),
        tankerId: Number(tankerId),
        status: 'Assigned'
      });
      await updateData('tankers', tanker.id, { status: 'Unavailable' });
      await updateData('users', driver.id, { status: 'Assigned' });
      alert('Tanker and driver assigned.');
    }

    loadHydrantOperatorData();
  }

  if (role === 'driver') {
    if (action === 'arrived') {
      await updateData('trips', id, { status: 'Arrived' });
    }

    if (action === 'delivered') {
      await updateData('trips', id, { status: 'Delivered' });
    }

    if (action === 'failed') {
      const reason = prompt('Enter failure reason:');
      if (!reason) return;
      await updateData('trips', id, { status: 'Failed', failureReason: reason });
    }

    loadDriverTrips();
  }
}

// This listens for customer actions like cancel, confirm and dispute.
document.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);

  if (action === 'cancel') {
    await cancelBooking(id);
  }

  if (action === 'confirm') {
    await confirmBooking(id);
  }

  if (action === 'dispute') {
    await disputeBooking(id);
  }

  if (button.dataset.role) {
    await handleRoleAction(event);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeData();
  } catch (error) {
    console.error('PaaniLink startup data initialization failed:', error);
    alert(error.message);
  }

  document.getElementById('loginForm').addEventListener('submit', loginUser);
  document.getElementById('bookingForm').addEventListener('submit', createBooking);
  document.getElementById('subsidyForm').addEventListener('submit', submitSubsidy);
  logoutBtn.addEventListener('click', logoutUser);

  const currentUser = getLoggedUser();
  if (currentUser) {
    const knownRoles = ['customer', 'zone-officer', 'hydrant-operator', 'driver', 'admin'];
    if (knownRoles.includes(currentUser.role)) {
      showDashboard(currentUser.role);
      await loadRoleData(currentUser.role);
    } else {
      console.error(`PaaniLink found a stored user with unknown role: ${currentUser.role}`);
      clearLoggedUser();
      showDashboard(null);
    }
  } else {
    showDashboard(null);
  }
});
