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
        const raw = member.birthDate || member.birthday;
        const parsedY = raw ? parseInt(raw.split('-')[0], 10) : NaN;
        return { m: member.birthMonth, d: member.birthDay, y: isNaN(parsedY) ? null : parsedY };
    }
    const rawDate = member.birthDate || member.birthday;
    if (!rawDate) return null;
    let [m, d, y] = [0, 0, 0];
    if (rawDate.includes('-')) {
        [y, m, d] = rawDate.split('-').map(Number);
    } else if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 2) {
            [m, d] = parts.map(Number);
        } else {
            [m, d, y] = parts.map(Number);
        }
    } else {
        const date = new Date(rawDate);
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
    let formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (d.y) {
        formatted += `, ${d.y}`;
    }
    return formatted;
};
