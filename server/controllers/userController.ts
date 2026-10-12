import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { UserRepository } from '../models/repositories.js';
import { IUser } from '../models/types.js';

function sanitize(user: IUser) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export const UserController = {
  // GET /api/v1/users?role=doctor|patient|admin&limit=&skip=
  async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const role = req.query.role as string;
      const limit = parseInt(req.query.limit as string) || 100;
      const skip = parseInt(req.query.skip as string) || 0;

      const users = role
        ? await UserRepository.listByRole(role)
        : await UserRepository.list();

      res.json({
        users: users.slice(skip, skip + limit).map(sanitize),
        totalCount: users.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list users' });
    }
  },

  // GET /api/v1/users/:id
  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await UserRepository.findById(req.params.id);
      if (!user) {
        res.status(404).json({ error: 'Not Found', message: 'User not found' });
        return;
      }
      res.json({ user: sanitize(user) });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch user' });
    }
  },

  // PATCH /api/v1/users/:id
  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, email, accountStatus, gender, profilePic, specialty, hospital, licenseNumber, phone, role } = req.body;

      if (accountStatus !== undefined && !['active', 'pending_activation', 'suspended'].includes(accountStatus)) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid accountStatus' });
        return;
      }
      if (role !== undefined && !['doctor', 'patient', 'admin'].includes(role)) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid role' });
        return;
      }
      if (email !== undefined) {
        const existing = await UserRepository.findByEmail(email);
        if (existing && existing._id !== req.params.id) {
          res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
          return;
        }
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = String(email).toLowerCase().trim();
      if (accountStatus !== undefined) updates.accountStatus = accountStatus;
      if (gender !== undefined) updates.gender = gender;
      if (profilePic !== undefined) updates.profilePic = profilePic;
      if (specialty !== undefined) updates.specialty = specialty;
      if (hospital !== undefined) updates.hospital = hospital;
      if (licenseNumber !== undefined) updates.licenseNumber = licenseNumber;
      if (phone !== undefined) updates.phone = phone;
      if (role !== undefined) updates.role = role;

      const updated = await UserRepository.update(req.params.id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Not Found', message: 'User not found' });
        return;
      }
      res.json({ message: 'User updated successfully', user: sanitize(updated) });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update user' });
    }
  },

  // DELETE /api/v1/users/:id
  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user!._id === req.params.id) {
        res.status(400).json({ error: 'Bad Request', message: 'You cannot delete your own account' });
        return;
      }
      const deleted = await UserRepository.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Not Found', message: 'User not found' });
        return;
      }
      res.json({ message: 'User deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete user' });
    }
  },
};

export const DoctorControllerResource = {
  // GET /api/v1/doctors
  async listDoctors(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const doctors = await UserRepository.listByRole('doctor');
      res.json({
        doctors: doctors.slice(0, limit).map(sanitize),
        totalCount: doctors.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list doctors' });
    }
  },

  // GET /api/v1/doctors/:id
  async getDoctorById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctor = await UserRepository.findById(req.params.id);
      if (!doctor || doctor.role !== 'doctor') {
        res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });
        return;
      }
      res.json({ doctor: sanitize(doctor) });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch doctor' });
    }
  },

  // PATCH /api/v1/doctors/:id
  async updateDoctor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctor = await UserRepository.findById(req.params.id);
      if (!doctor || doctor.role !== 'doctor') {
        res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });
        return;
      }
      const { name, specialty, hospital, licenseNumber, phone, gender, profilePic, accountStatus } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (specialty !== undefined) updates.specialty = specialty;
      if (hospital !== undefined) updates.hospital = hospital;
      if (licenseNumber !== undefined) updates.licenseNumber = licenseNumber;
      if (phone !== undefined) updates.phone = phone;
      if (gender !== undefined) updates.gender = gender;
      if (profilePic !== undefined) updates.profilePic = profilePic;
      if (accountStatus !== undefined) updates.accountStatus = accountStatus;

      const updated = await UserRepository.update(req.params.id, updates);
      res.json({ message: 'Doctor updated successfully', doctor: sanitize(updated!) });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update doctor' });
    }
  },

  // DELETE /api/v1/doctors/:id
  async deleteDoctor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user!._id === req.params.id) {
        res.status(400).json({ error: 'Bad Request', message: 'You cannot delete your own account' });
        return;
      }
      const doctor = await UserRepository.findById(req.params.id);
      if (!doctor || doctor.role !== 'doctor') {
        res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });
        return;
      }
      await UserRepository.delete(req.params.id);
      res.json({ message: 'Doctor deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete doctor' });
    }
  },
};