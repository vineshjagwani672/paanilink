const API_URL = 'http://localhost:3000';

const loginSection = document.getElementById('loginSection');
const logoutBtn = document.getElementById('logoutBtn');
const dashboards = document.querySelectorAll('.dashboard');

// Simple Fetch functions for the mock API.
async function getData(endpoint) {
  const response = await fetch(`${API_URL}/${endpoint}`);
  return response.json();
}

async function addData(endpoint, data) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

async function updateData(endpoint, id, data) {
  const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

function getLoggedUser() {
  const user = localStorage.getItem('paaniUser');
  return user ? JSON.parse(user) : null;
}

function saveLoggedUser(user) {
  localStorage.setItem('paaniUser', JSON.stringify(user));
}

function clearLoggedUser() {
  localStorage.removeItem('paaniUser');
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
    const isActive = dashboard.id === activeDashboardId;
    dashboard.classList.toggle('hidden', !isActive);
  });

  if (role) {
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
  const password = document.getElementById('loginPassword').value.trim();
  const role = document.getElementById('loginRole').value;

  if (!email || !password) {
    alert('Please enter email and password.');
    return;
  }

  const users = await getData('users');
  const user = users.find(
    (item) => item.email === email && item.password === password && item.role === role
  );

  if (!user) {
    alert('Invalid login details for this role.');
    return;
  }

  saveLoggedUser(user);
  showDashboard(role);
  loadRoleData(role);
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

document.getElementById('loginForm').addEventListener('submit', loginUser);
document.getElementById('bookingForm').addEventListener('submit', createBooking);
document.getElementById('subsidyForm').addEventListener('submit', submitSubsidy);
logoutBtn.addEventListener('click', logoutUser);

// On page load, check if a user is already logged in.
const currentUser = getLoggedUser();
if (currentUser) {
  showDashboard(currentUser.role);
  loadRoleData(currentUser.role);
} else {
  showDashboard(null);
}
