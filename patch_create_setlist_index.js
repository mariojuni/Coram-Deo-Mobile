const fs = require('fs');
const path = '/Users/maryow/CoramDeoMobile/src/app/create-setlist/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add Trash2 to imports
content = content.replace(
  "import { X, CalendarDays, ChevronRight } from 'lucide-react-native';",
  "import { X, CalendarDays, ChevronRight, Trash2 } from 'lucide-react-native';"
);

// Add handleDeleteSetlist to context destructure
content = content.replace(
  "    isEditing,\n  } = useCreateSetlistContext();",
  "    isEditing,\n    handleDeleteSetlist,\n  } = useCreateSetlistContext();"
);

// Add delete button at the bottom of SetlistForm if isEditing
const deleteBtn = `
          {isEditing && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                backgroundColor: '#FEF2F2',
                borderRadius: 14,
                marginTop: 20,
              }}
              onPress={handleDeleteSetlist}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Delete Setlist</Text>
            </TouchableOpacity>
          )}
        </View>
`;
content = content.replace(
  "          />\n        </View>\n      </ScrollView>",
  "          />\n" + deleteBtn + "      </ScrollView>"
);

fs.writeFileSync(path, content, 'utf8');
