import React from 'react';
import { ODManagement } from './ODManagement';
import { Student, User, MedicalLeaveRecord } from '../types';

interface MedicalLeaveProps {
  students: Student[];
  currentUser: User | null;
  mlRecords?: MedicalLeaveRecord[];
  onRefresh?: () => void;
}

export const MedicalLeaveManagement: React.FC<MedicalLeaveProps> = ({
  students,
  currentUser,
  onRefresh
}) => {
  return (
    <ODManagement
      students={students}
      currentUser={currentUser}
      onRefresh={onRefresh}
    />
  );
};
