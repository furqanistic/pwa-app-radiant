import MembershipManagementModal from '@/components/Management/MembershipManagementModal';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout/Layout';

const MembershipManagementPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <MembershipManagementModal
        renderMode="page"
        onClose={() => navigate('/management')}
      />
    </Layout>
  );
};

export default MembershipManagementPage;
