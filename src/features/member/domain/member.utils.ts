export const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.split(/[\s-]+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

export const formatMemberName = (member: any) => {
    let displayName = member.name || '';
    if (member.firstName || member.lastName) {
        const f = toTitleCase(member.firstName);
        const l = toTitleCase(member.lastName);
        const m = member.middleName ? member.middleName.charAt(0).toUpperCase() + '.' : '';
        displayName = [f, m, l].filter(Boolean).join(' ');
    } else if (member.name) {
        const parts = member.name.split(' ').filter(Boolean);
        if (parts.length > 2) {
            const f = toTitleCase(parts[0]);
            const l = toTitleCase(parts[parts.length - 1]);
            const m = parts[1].charAt(0).toUpperCase() + '.';
            displayName = `${f} ${m} ${l}`;
        } else {
            displayName = toTitleCase(member.name);
        }
    }
    return displayName || 'Unnamed Member';
};

export const parseMemberDate = (member: any) => {
    if (member.birthMonth && member.birthDay) {
        return { m: member.birthMonth, d: member.birthDay, y: member.birthDate ? parseInt(member.birthDate.split('-')[0]) : null };
    }
    if (!member.birthday) return null;
    let [m, d, y] = [0, 0, 0];
    if (member.birthday.includes('-')) {
        [y, m, d] = member.birthday.split('-').map(Number);
    } else if (member.birthday.includes('/')) {
        const parts = member.birthday.split('/');
        if (parts.length === 2) {
            [m, d] = parts.map(Number);
        } else {
            [m, d, y] = parts.map(Number);
        }
    } else {
        const date = new Date(member.birthday);
        if (!isNaN(date.getTime())) {
            m = date.getMonth() + 1;
            d = date.getDate();
        }
    }
    if (m && d && !isNaN(m) && !isNaN(d)) return { m, d, y: isNaN(y) ? null : y };
    return null;
};

export const formatBirthday = (member: any) => {
    const d = parseMemberDate(member);
    if (!d) return '';
    const date = new Date(2000, d.m - 1, d.d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
