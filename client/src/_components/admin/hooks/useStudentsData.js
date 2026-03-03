/**
 * Hook: tải danh sách sinh viên + lọc client-side
 * Trả về students, filteredStudents, loading, loadStudents, bộ lọc và clearFilters.
 */
import { useState, useRef, useMemo, useCallback } from 'react';
import { message } from 'antd';

const BASE = '/api/admin';
const LOAD_TIMEOUT_MS = 20000;

export function useStudentsData(fetchWrapper) {
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [statusFilter, setStatusFilter] = useState();
    const [majorFilter, setMajorFilter] = useState('');
    const [universityFilter, setUniversityFilter] = useState('');
    const [periodFilter, setPeriodFilter] = useState();
    const [searchKeyword, setSearchKeyword] = useState('');

    const loadIdRef = useRef(0);
    const isLoadingRef = useRef(false);

    const loadStudents = useCallback(async () => {
        if (isLoadingRef.current) {
            message.info({ content: 'Đang tải, vui lòng đợi...', key: 'students-load-wait' });
            return;
        }
        isLoadingRef.current = true;
        const thisLoadId = ++loadIdRef.current;
        let timeoutId = null;
        try {
            setLoading(true);
            timeoutId = setTimeout(() => {
                if (thisLoadId !== loadIdRef.current) return;
                isLoadingRef.current = false;
                setLoading(false);
                message.warning('Tải quá lâu. Vui lòng thử lại hoặc kiểm tra kết nối.');
            }, LOAD_TIMEOUT_MS);

            const url = `${BASE}/students`;
            const urlLegacy = `${BASE}/users/all`;
            let data = null;
            try {
                const res = await fetchWrapper.get(url);
                data = await res.json();
                if (data.status !== 'Success') data = null;
            } catch (e) {
                try {
                    const res = await fetchWrapper.get(urlLegacy);
                    data = await res.json();
                } catch (e2) {
                    throw e2;
                }
            }

            if (thisLoadId !== loadIdRef.current) return;
            if (data && data.status === 'Success') {
                setStudents(Array.isArray(data.data) ? data.data : []);
            }
        } catch (e) {
            if (thisLoadId !== loadIdRef.current) return;
            message.error(e.message || 'Không tải được danh sách');
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            isLoadingRef.current = false;
            if (thisLoadId === loadIdRef.current) setLoading(false);
        }
    }, [fetchWrapper]);

    const filteredStudents = useMemo(() => {
        let list = students;
        if (statusFilter) {
            list = list.filter(s => {
                const st = (s.internship_status || s.registration_status || s.status || '').toString().trim();
                return st === statusFilter;
            });
        }
        if (majorFilter && majorFilter.trim()) {
            const q = majorFilter.trim().toLowerCase();
            list = list.filter(s => ((s.major || '').toString().toLowerCase()).includes(q));
        }
        if (universityFilter && universityFilter.trim()) {
            const q = universityFilter.trim().toLowerCase();
            list = list.filter(s => ((s.university || '').toString().toLowerCase()).includes(q));
        }
        if (periodFilter) {
            const pid = String(periodFilter);
            list = list.filter(s => {
                const sid = s.internship_period_id != null ? String(s.internship_period_id) : (s.period_id != null ? String(s.period_id) : '');
                return sid === pid;
            });
        }
        if (searchKeyword && searchKeyword.trim()) {
            const q = searchKeyword.trim().toLowerCase();
            list = list.filter(s => {
                const name = (s.full_name || s.name || '').toString().toLowerCase();
                const code = (s.student_code || '').toString().toLowerCase();
                const email = (s.email || '').toString().toLowerCase();
                const phone = (s.phone || s.phone_number || '').toString().toLowerCase();
                return name.includes(q) || code.includes(q) || email.includes(q) || phone.includes(q);
            });
        }
        return list;
    }, [students, statusFilter, majorFilter, universityFilter, periodFilter, searchKeyword]);

    const clearFilters = useCallback(() => {
        setStatusFilter(undefined);
        setMajorFilter('');
        setUniversityFilter('');
        setPeriodFilter(undefined);
        setSearchKeyword('');
    }, []);

    return {
        loading,
        setLoading,
        students,
        filteredStudents,
        loadStudents,
        statusFilter,
        setStatusFilter,
        majorFilter,
        setMajorFilter,
        universityFilter,
        setUniversityFilter,
        periodFilter,
        setPeriodFilter,
        searchKeyword,
        setSearchKeyword,
        clearFilters,
    };
}
