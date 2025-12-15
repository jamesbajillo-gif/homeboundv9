import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, User, Calendar } from "lucide-react";
import { useVICI } from "@/contexts/VICIContext";
import { Separator } from "@/components/ui/separator";

export const VICILeadDisplay = () => {
  const { leadData, isVICIMode } = useVICI();

  // Hidden by default - lead info is shown in the header instead
  if (true) {
    return null;
  }

  return (
    <Card className="p-3 sm:p-4 mb-3 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="default" className="gap-1 text-xs">
          <User className="h-3 w-3" />
          Lead Info
        </Badge>
        {leadData.lead_id && (
          <span className="text-xs text-muted-foreground">
            ID: {leadData.lead_id}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Name */}
        {(leadData.fullname || leadData.first_name || leadData.last_name) && (
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">
                {leadData.fullname || `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim()}
              </p>
              {leadData.age && (
                <p className="text-xs text-muted-foreground">Age: {leadData.age}</p>
              )}
            </div>
          </div>
        )}

        {/* Phone */}
        {leadData.phone_number && (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">{leadData.phone_number}</p>
              {leadData.alt_phone && (
                <p className="text-xs text-muted-foreground truncate">Alt: {leadData.alt_phone}</p>
              )}
            </div>
          </div>
        )}

        {/* Email */}
        {leadData.email && (
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium truncate">{leadData.email}</p>
          </div>
        )}

        {/* Location */}
        {(leadData.city || leadData.state || leadData.postal_code) && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">
                {[leadData.city, leadData.state].filter(Boolean).join(', ')}
              </p>
              {leadData.postal_code && (
                <p className="text-xs text-muted-foreground">{leadData.postal_code}</p>
              )}
            </div>
          </div>
        )}

        {/* Date of Birth */}
        {leadData.date_of_birth && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{leadData.date_of_birth}</p>
          </div>
        )}
      </div>

      {/* Address */}
      {leadData.address1 && (
        <>
          <Separator className="my-2" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Address:</p>
            <p className="truncate">{leadData.address1}</p>
            {leadData.address2 && <p className="truncate">{leadData.address2}</p>}
            {leadData.address3 && <p className="truncate">{leadData.address3}</p>}
          </div>
        </>
      )}

      {/* Call Info */}
      {(leadData.call_id || leadData.user_group) && (
        <>
          <Separator className="my-2" />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {leadData.call_id && (
              <span className="truncate">Call: {leadData.call_id}</span>
            )}
            {leadData.user_group && (
              <span className="truncate">Group: {leadData.user_group}</span>
            )}
            {leadData.list_id && (
              <span className="truncate">List: {leadData.list_id}</span>
            )}
          </div>
        </>
      )}
    </Card>
  );
};
