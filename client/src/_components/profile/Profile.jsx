import { useHistory } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { Breadcrumb } from 'antd';
import { profileAtom } from '_state';
import { ProfileForm, TwoFASection } from '_components/profile';

export { Profile };

function Profile() {
    const history = useHistory();
    const [profile, setProfile] = useRecoilState(profileAtom);
    return (
        <div style={{ paddingTop: 24 }}>
            <Breadcrumb style={{ marginBottom: 16, fontSize: 13, color: '#8c8c8c', padding: '0 24px' }}>
                <Breadcrumb.Item><span style={{ cursor: 'pointer', color: '#8c8c8c' }} onClick={() => history.push('/')}>Trang chủ</span></Breadcrumb.Item>
                <Breadcrumb.Item>Hồ sơ cá nhân</Breadcrumb.Item>
            </Breadcrumb>
            <ProfileForm data={profile} isTable={false} />
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 24px' }}>
                <TwoFASection />
            </div>
        </div>
    );
}